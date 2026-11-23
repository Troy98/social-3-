import { z } from "zod";
import { createNotification, getNotifications, getSingleNotification } from "../notification.validation";

export type CreateNotificationDto = z.infer<ReturnType<typeof createNotification>>["body"];
export type GetNotificationsDto = z.infer<ReturnType<typeof getNotifications>>["query"];
export type NotificationParamsDto = z.infer<ReturnType<typeof getSingleNotification>>["params"];
