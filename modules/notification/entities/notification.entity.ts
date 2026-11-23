import { INotification } from "../../../common/interface";

export type INotificationResponse = INotification;

export interface INotificationCountResponse {
    totalCount: number;
    unreadCount: number;
}

export interface IUnreadCountResponse {
    count: number;
    unreadCount: number;
}
