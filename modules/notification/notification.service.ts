import mongoose, { HydratedDocument, QueryFilter } from "mongoose";
import { ForbiddenException, NotfoundException } from "../../common/exception";
import { INotification, IPaginate } from "../../common/interface";
import { NotificationRepository, UserRepository } from "../../common/repository";
import { notificationService, NotificationService as FirebaseNotificationService } from "../../common/service";
import { toObjectId } from "../../common/utils";
import { HNotification, HUser } from "../../DB/model";
import { CreateNotificationDto, GetNotificationsDto } from "./dto/notification.dto";
import { INotificationCountResponse, IUnreadCountResponse } from "./entities/notification.entity";

export class NotificationService {
    private readonly notificationRepository: NotificationRepository;
    private readonly userRepository: UserRepository;
    private readonly pushService: FirebaseNotificationService;
    constructor() {
        this.notificationRepository = new NotificationRepository();
        this.userRepository = new UserRepository();
        this.pushService = notificationService;
    }

    async createNotification(body: CreateNotificationDto, sender: HUser): Promise<HydratedDocument<INotification>[]> {
        const rawRecipientIds = body.recipient_ids ?? (body.recipient_id ? [body.recipient_id] : []);
        const recipientIds = Array.from(new Set(rawRecipientIds.filter(Boolean)));
        if (!recipientIds.length) {
            throw new NotfoundException("No recipients provided");
        }
        const createdDocs: HydratedDocument<INotification>[] = [];
        for (const recipientId of recipientIds) {
            const recipientObjId = toObjectId(recipientId);
            const recipient = await this.userRepository.findById({ id: recipientObjId });
            if (!recipient) {continue;}
            const doc = await this.notificationRepository.createOne({
                data: {
                    recipient_id: recipientObjId,
                    sender_id: sender._id,
                    type: body.type,
                    target_id: body.target_id ? toObjectId(body.target_id) : undefined,
                    is_read: false,
                    created_at: new Date(),
                },
            });
            createdDocs.push(doc);

            // FCM Push notification integration
            try {
                const tokens = await this.pushService.getFCMs({ userId: recipientObjId });
                if (tokens && tokens.length > 0) {
                    const senderName = sender.username || `${sender.firstName} ${sender.lastName}`.trim();
                    const notifTitle = body.title || `New ${body.type} Notification`;
                    const notifBody = body.body || `${senderName} sent you a notification`;
                    await this.pushService.sendNotifications({
                        tokens,
                        notification: {
                            title: notifTitle,
                            body: notifBody,
                        },
                    });
                }
            } catch (fcmError) {
                console.error("FCM push delivery error (non-fatal):", fcmError);
            }
        }
        return createdDocs;
    }

    async getReceivedNotifications(user: HUser,query: GetNotificationsDto): Promise<IPaginate<HydratedDocument<INotification>>> {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const filter: QueryFilter<INotification> = {
            recipient_id: user._id,
        };
        if (query.is_read !== undefined) {
            filter.is_read = query.is_read === "true";
        }
        return await this.notificationRepository.paginate({
            filter,
            page,
            limit,
            options: {
                sort: { created_at: -1 },
                populate: [
                    { path: "sender_id", select: "firstName lastName username image" },
                    { path: "recipient_id", select: "firstName lastName username image" },
                ],
            },
        });
    }

    async getSentNotifications(user: HUser,query: GetNotificationsDto): Promise<IPaginate<HydratedDocument<INotification>>> {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const filter: QueryFilter<INotification> = {
            sender_id: user._id,
        };
        return await this.notificationRepository.paginate({
            filter,
            page,
            limit,
            options: {
                sort: { created_at: -1 },
                populate: [
                    { path: "recipient_id", select: "firstName lastName username image" },
                ],
            },
        });
    }

    async getNotificationById( notificationId: string,user: HUser): Promise<HydratedDocument<INotification>> {
        const notification = await this.notificationRepository.findById({
            id: toObjectId(notificationId),
            options: {
                populate: [
                    { path: "sender_id", select: "firstName lastName username image" },
                    { path: "recipient_id", select: "firstName lastName username image" },
                ],
            },
        });
        if (!notification) {
            throw new NotfoundException("Notification not found");
        }
        const isRecipient = notification.recipient_id._id
            ? notification.recipient_id._id.toString() === user._id.toString()
            : notification.recipient_id.toString() === user._id.toString();
        const isSender = notification.sender_id._id
            ? notification.sender_id._id.toString() === user._id.toString()
            : notification.sender_id.toString() === user._id.toString();
        if (!isRecipient && !isSender) {
            throw new ForbiddenException("You are not authorized to view this notification");
        }
        return notification;
    }

    async markAsRead(notificationId: string, user: HUser): Promise<HydratedDocument<INotification>> {
        const notification = await this.notificationRepository.findById({
            id: toObjectId(notificationId),
        });
        if (!notification) {
            throw new NotfoundException("Notification not found");
        }
        if (notification.recipient_id.toString() !== user._id.toString()) {
            throw new ForbiddenException("Only the recipient can mark this notification as read");
        }
        notification.is_read = true;
        await notification.save();
        return notification;
    }

    async markAllAsRead(user: HUser): Promise<{ message: string; modifiedCount: number }> {
        const result = await this.notificationRepository.updateMany({
            filter: {
                recipient_id: user._id,
                is_read: false,
            },
            update: {
                $set: { is_read: true },
            },
        });
        return {
            message: "All notifications marked as read",
            modifiedCount: result.modifiedCount,
        };
    }

    async getUnreadCount(user: HUser): Promise<IUnreadCountResponse> {
        const count = await this.notificationRepository.countDocuments({
            filter: {
                recipient_id: user._id,
                is_read: false,
            },
        });

        return { count, unreadCount: count };
    }

    async getTotalCount(user: HUser): Promise<INotificationCountResponse> {
        const totalCount = await this.notificationRepository.countDocuments({
            filter: {
                recipient_id: user._id,
            },
        });
        const unreadCount = await this.notificationRepository.countDocuments({
            filter: {
                recipient_id: user._id,
                is_read: false,
            },
        });
        return { totalCount, unreadCount };
    }

    async deleteNotification(notificationId: string, user: HUser): Promise<{ message: string }> {
        const notification = await this.notificationRepository.findById({
            id: toObjectId(notificationId),
        });
        if (!notification) {
            throw new NotfoundException("Notification not found");
        }
        const isRecipient = notification.recipient_id.toString() === user._id.toString();
        const isSender = notification.sender_id.toString() === user._id.toString();
        if (!isRecipient && !isSender) {
            throw new ForbiddenException("You are not authorized to delete this notification");
        }
        await this.notificationRepository.deleteOne({
            filter: { _id: notification._id },
        });
        return { message: "Notification deleted successfully" };
    }

    async deleteAllNotifications( user: HUser,role: "recipient" | "sender" = "recipient"): Promise<{ message: string; deletedCount: number }> {
        const filter: QueryFilter<INotification> = role === "sender" ? { sender_id: user._id } : { recipient_id: user._id };
        const result = await this.notificationRepository.deleteMany({ filter });
        return {
            message: `All ${role} notifications deleted successfully`,
            deletedCount: result.deletedCount,
        };
    }
}

export const notificationAppService = new NotificationService();
