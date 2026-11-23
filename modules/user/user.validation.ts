import z from "zod";
import { LanguageEnum, LogoutEnum, ProfileVisibilityEnum } from "../../common/enum";
import { generalValidationFields } from "../../common/utils";

export const logout = (lang: LanguageEnum) => {
    return z.object({
        body: z.object({
            action: z.nativeEnum(LogoutEnum).optional(),
            FCM: z.string().optional(),
        }).optional(),
    });
};

export const rotateToken = (lang: LanguageEnum) => {
    return z.object({
        body: z.object({
            FCM: z.string().optional(),
        }).optional(),
    });
};

export const followUser = (lang: LanguageEnum) => {
    return z.object({
        params: z.strictObject({
            userId: generalValidationFields.id(lang),
        })
    });
};

export const unfollowUser = (lang: LanguageEnum) => {
    return z.object({
        params: z.strictObject({
            userId: generalValidationFields.id(lang),
        })
    });
};

export const searchUsers = (lang: LanguageEnum) => {
    return z.object({
        query: z.object({
            q: z.string().min(1),
            page: z.coerce.number().int().min(1).optional(),
            limit: z.coerce.number().int().min(1).max(50).optional(),
        })
    });
};

export const updateSettings = (lang: LanguageEnum) => {
    return z.object({
        body: z.strictObject({
            profileVisibility: z.enum(ProfileVisibilityEnum).optional(),
        })
    });
};
