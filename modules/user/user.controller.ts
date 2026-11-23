import { NextFunction, Request, Response, Router } from "express";
import { authentication, responseFormatter, uploadMiddleware, validation } from "../../middleware";
import { userService } from "./user.service";
import { getIssuer } from "../../common/utils";
import { TokenTypeEnum } from "../../common/enum";
import { fileValidation, localFileUpload } from "../../common/utils/multer";
import * as validators from './user.validation';
import { IResponse, IUser } from "../../common/interface";
import { IFile } from "../../common/types/multer.types.js";


const router = Router({ caseSensitive: true, strict: true });

router.get("/", authentication(), responseFormatter(
    async (req: Request, res: Response, next: NextFunction) => {
        return { data: req.user };
    }
));

router.patch("/profile-image",authentication(),
    uploadMiddleware({
        multerMiddleware: localFileUpload({}).single("attachment"),
        validation: fileValidation.image,
        customPath: "User"
    }),
    responseFormatter(
        async (req: Request, res: Response, next: NextFunction): Promise<IResponse<IUser>> => {
            const account = await userService.profileImage(req.file as IFile, req.user);
            return { data: account };
        }
    )
);



router.patch("/profile-cover-image",authentication(),
    uploadMiddleware({
        multerMiddleware: localFileUpload({}).array("attachments", 3),
        validation: fileValidation.image,
        customPath: "User"
    }),
    responseFormatter(
        async (req: Request, res: Response, next: NextFunction): Promise<IResponse<IUser>> => {
            const account = await userService.profileCoverImages( req.files as IFile[], req.user);
            return { data: account };
        }
    )
);



router.post("/rotate-token", authentication(TokenTypeEnum.REFRESH), validation(validators.rotateToken),
    responseFormatter(
        async (req: Request, res: Response, next: NextFunction) => {
            const data = await userService.rotateToken(req.payload, req.user, getIssuer(req), req.body);
            return data;
        }
    )
);

router.post("/logout", authentication(), validation(validators.logout),
    responseFormatter(
        async (req: Request, res: Response, next: NextFunction) => {
            const data = await userService.logout(req.payload, req.user, req.body);
            return data;
        }
    )
);



router.post("/follow/:userId",authentication(),validation(validators.followUser),
    responseFormatter(
        async (req: Request, res: Response, next: NextFunction): Promise<IResponse> => {
            const data = await userService.followUser(req.user, req.validate.params.userId);
            return { data, status: 200 };
        }
    )
);

router.delete("/unfollow/:userId",authentication(),validation(validators.unfollowUser),
    responseFormatter(
        async (req: Request, res: Response, next: NextFunction): Promise<IResponse> => {
            const data = await userService.unfollowUser(req.user, req.validate.params.userId);
            return { data, status: 200 };
        }
    )
);



router.get("/search",authentication(),validation(validators.searchUsers),
    responseFormatter(
        async (req: Request, res: Response, next: NextFunction): Promise<IResponse> => {
            const { q, page, limit } = req.validate.query;
            const data = await userService.searchUsers(q, req.user._id, page, limit);
            return { data, status: 200 };
        }
    )
);

router.get("/suggestions",authentication(),responseFormatter(
        async (req: Request, res: Response, next: NextFunction): Promise<IResponse> => {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const data = await userService.getSuggestions(req.user, page, limit);
            return { data, status: 200 };
        }
    )
);



router.get("/settings",authentication(),
    responseFormatter(
        async (req: Request, res: Response, next: NextFunction): Promise<IResponse> => {
            const data = await userService.getSettings(req.user);
            return { data, status: 200 };
        }
    )
);

router.patch("/settings",authentication(),validation(validators.updateSettings),
    responseFormatter(
        async (req: Request, res: Response, next: NextFunction): Promise<IResponse> => {
            const data = await userService.updateSettings(req.user, req.validate.body);
            return { data, status: 200 };
        }
    )
);

export default router;