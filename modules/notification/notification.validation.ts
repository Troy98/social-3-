import { z } from "zod";
import { generalValidationFields } from "../../common/utils";
import { LanguageEnum, NotificationTypeEnum } from "../../common/enum";

export const createNotification = (lang: LanguageEnum) => {
    return z.object({
        body: z.object({
            recipient_id: generalValidationFields.id(lang).optional(),
            recipient_ids: z.array(generalValidationFields.id(lang)).min(1).optional(),
            type: z.nativeEnum(NotificationTypeEnum),
            target_id: generalValidationFields.id(lang).optional(),
            title: z.string().trim().min(1).optional(),
            body: z.string().trim().min(1).optional(),
        }).refine(data => Boolean(data.recipient_id || (data.recipient_ids && data.recipient_ids.length > 0)), {
            message: "Either recipient_id or recipient_ids must be provided",
            path: ["recipient_id"],
        }),
    });
};

export const getSingleNotification = (lang: LanguageEnum) => {
    return z.object({
        params: z.strictObject({
            notificationId: generalValidationFields.id(lang),
        }),
    });
};

export const getNotifications = (lang: LanguageEnum) => {
    return z.object({
        query: z.object({
            page: z.coerce.number().int().min(1).optional(),
            limit: z.coerce.number().int().min(1).max(50).optional(),
            is_read: z.enum(["true", "false"]).optional(),
        }),
    });
};

export const deleteNotificationsQuery = (lang: LanguageEnum) => {
    return z.object({
        query: z.object({
            role: z.enum(["recipient", "sender"]).optional(),
        }),
    });
};
