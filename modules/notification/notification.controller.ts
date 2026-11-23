import { NextFunction, Request, Response, Router } from "express";
import { IResponse } from "../../common/interface";
import { authentication, responseFormatter, validation } from "../../middleware";
import { notificationAppService } from "./notification.service";
import * as validators from "./notification.validation";

const router = Router({ caseSensitive: true, strict: true });


router.post("/", authentication(),validation(validators.createNotification),
    responseFormatter(
        async (req: Request, res: Response, next: NextFunction): Promise<IResponse> => {
            const data = await notificationAppService.createNotification(req.validate.body, req.user);
            return { data, status: 201 };
        }
    )
);

router.get("/sent",authentication(),validation(validators.getNotifications),
    responseFormatter(
        async (req: Request, res: Response, next: NextFunction): Promise<IResponse> => {
            const data = await notificationAppService.getSentNotifications(req.user, req.validate.query);
            return { data, status: 200 };
        }
    )
);


router.get("/unread-count",authentication(),
    responseFormatter(
        async (req: Request, res: Response, next: NextFunction): Promise<IResponse> => {
            const data = await notificationAppService.getUnreadCount(req.user);
            return { data, status: 200 };
        }
    )
);


router.get("/count",authentication(),
    responseFormatter(
        async (req: Request, res: Response, next: NextFunction): Promise<IResponse> => {
            const data = await notificationAppService.getTotalCount(req.user);
            return { data, status: 200 };
        }
    )
);


router.patch("/read-all",authentication(),
    responseFormatter(
        async (req: Request, res: Response, next: NextFunction): Promise<IResponse> => {
            const data = await notificationAppService.markAllAsRead(req.user);
            return { data, status: 200 };
        }
    )
);


router.delete("/sent",authentication(),
    responseFormatter(
        async (req: Request, res: Response, next: NextFunction): Promise<IResponse> => {
            const data = await notificationAppService.deleteAllNotifications(req.user, "sender");
            return { data, status: 200 };
        }
    )
);


router.get( "/",authentication(),validation(validators.getNotifications),
    responseFormatter(
        async (req: Request, res: Response, next: NextFunction): Promise<IResponse> => {
            const data = await notificationAppService.getReceivedNotifications(req.user, req.validate.query);
            return { data, status: 200 };
        }
    )
);


router.delete("/",authentication(),validation(validators.deleteNotificationsQuery),
    responseFormatter(
        async (req: Request, res: Response, next: NextFunction): Promise<IResponse> => {
            const role = req.validate?.query?.role as "recipient" | "sender" | undefined;
            const data = await notificationAppService.deleteAllNotifications(req.user, role);
            return { data, status: 200 };
        }
    )
);


router.get("/:notificationId",authentication(),validation(validators.getSingleNotification),
    responseFormatter(
        async (req: Request, res: Response, next: NextFunction): Promise<IResponse> => {
            const data = await notificationAppService.getNotificationById(req.validate.params.notificationId, req.user);
            return { data, status: 200 };
        }
    )
);


router.patch("/:notificationId/read",authentication(),validation(validators.getSingleNotification),
    responseFormatter(
        async (req: Request, res: Response, next: NextFunction): Promise<IResponse> => {
            const data = await notificationAppService.markAsRead(req.validate.params.notificationId, req.user);
            return { data, status: 200 };
        }
    )
);


router.delete("/:notificationId",authentication(),validation(validators.getSingleNotification),
    responseFormatter(
        async (req: Request, res: Response, next: NextFunction): Promise<IResponse> => {
            const data = await notificationAppService.deleteNotification(req.validate.params.notificationId, req.user);
            return { data, status: 200 };
        }
    )
);

export default router;
