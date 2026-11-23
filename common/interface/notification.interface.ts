import mongoose from "mongoose";
import { NotificationTypeEnum } from "../enum";

export interface INotification {
    _id?: mongoose.Types.ObjectId;
    notification_id?: mongoose.Types.ObjectId;
    recipient_id: mongoose.Types.ObjectId;
    sender_id: mongoose.Types.ObjectId;
    type: NotificationTypeEnum | string;
    target_id?: mongoose.Types.ObjectId | string;
    is_read: boolean;
    created_at?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
