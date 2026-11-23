import mongoose, { HydratedDocument } from "mongoose"
import { LogoutEnum } from "../../common/enum"
import { BadRequestException, ConflictException, NotfoundException } from "../../common/exception"
import { UserRepository} from "../../common/repository"
import { cacheService, CacheService, JwtPayloadType, tokenService, TokenService,CloudService ,cloudService, notificationService, NotificationService} from "../../common/service"
import { ACCESS_TOKEN_EXPIRES_IN } from "../../config"
import { HUser } from "../../DB/model"
import { IUser } from "../../common/interface"
import { IFile } from "../../common/types/multer.types.js"

export class UserService {
    private readonly tokenService:TokenService
    private readonly userRepository:UserRepository
    private readonly cacheService : CacheService
    private readonly cloudService : CloudService
    private readonly notificationService : NotificationService
    constructor(){
        this.tokenService = tokenService
        this.userRepository=new UserRepository()
        this.cacheService = cacheService
        this.cloudService = cloudService
        this.notificationService = notificationService
    }

    async profileImage(file: IFile, user: HUser): Promise<IUser> {
        const oldImage = user.image
        const { Key } = await this.cloudService.uploadLargeAsset({file,path: `User/${user._id.toString()}/profile`});
        user.image = Key as string;
        await user.save();
        if(oldImage?.length){
            await this.cloudService.deleteAsset({Key:oldImage})
        }
        return user.toJSON();
    }



    async profileCoverImages(files: IFile[], user: HUser): Promise<IUser> {
        const oldCover = user.coverImage || []
        user.coverImage = await this.cloudService.uploadAssets({ files, path: `User/${user._id.toString()}/profile/cover`});
        await user.save();
        if(oldCover?.length){
            await this.cloudService.deleteAssets({Keys:oldCover})
        }
        return user.toJSON();
    }



    async rotateToken(payload:JwtPayloadType, user:HUser, issuer:string, { FCM }:{FCM?:string} = {}){
        const accessExpiresIn = (payload.iat + ACCESS_TOKEN_EXPIRES_IN) * 1000
        const currentTime = Date.now() + (30 * 60000)
        if (currentTime < accessExpiresIn) {
            throw new ConflictException("Sorry we cannot create new login credentials while current access token still within valid time range")
        }
        const data = await this.tokenService.createLoginCredentials({user,issuer}) 
        await this.tokenService.createRevokeToken({payload,user})
        if (FCM) {
            await this.notificationService.removeFCM({ userId: payload.sub, FCM });
        }
        return data
    }


    async logout(payload:JwtPayloadType, user:HUser, { action = LogoutEnum.DEVICE, FCM }:{action?:LogoutEnum, FCM?:string} = {}){
        switch (action) {
            case LogoutEnum.ALL:
                user.changeCredentialsTime = new Date();
                await user.save();
                await this.cacheService.del({ key: await this.cacheService.keys({ prefix: this.tokenService.userBaseRevokeTokenKey({ userId: payload.sub }) }) });
                await this.notificationService.removeFCMUser({ userId: payload.sub });
                break;
            default:
                await this.tokenService.createRevokeToken({ payload , user });
                if (FCM) {
                    await this.notificationService.removeFCM({ userId: payload.sub, FCM });
                }
                break;
        }
        return;
    }



    async followUser(currentUser: HydratedDocument<IUser>, targetUserId: string) {
        if (currentUser._id.toString() === targetUserId) {
            throw new BadRequestException("You cannot follow yourself");
        }
        const targetUser = await this.userRepository.findById({
            id: new mongoose.Types.ObjectId(targetUserId),
            options: { lean: false }
        });
        if (!targetUser) throw new NotfoundException("User not found");
        const alreadyFollowing = currentUser.following?.some(
            (id: mongoose.Types.ObjectId) => id.toString() === targetUserId
        );
        if (alreadyFollowing) {
            throw new ConflictException("You are already following this user");
        }
        await this.userRepository.findByIdAndUpdate({
            id: currentUser._id,
            update: { $addToSet: { following: new mongoose.Types.ObjectId(targetUserId) } }
        });
        await this.userRepository.findByIdAndUpdate({
            id: new mongoose.Types.ObjectId(targetUserId),
            update: { $addToSet: { followers: currentUser._id } }
        });
        return { message: "User followed successfully" };
    }



    async unfollowUser(currentUser: HydratedDocument<IUser>, targetUserId: string) {
        if (currentUser._id.toString() === targetUserId) {
            throw new BadRequestException("You cannot unfollow yourself");
        }
        const targetUser = await this.userRepository.findById({
            id: new mongoose.Types.ObjectId(targetUserId),
            options: { lean: false }
        });
        if (!targetUser) throw new NotfoundException("User not found");
        const isFollowing = currentUser.following?.some(
            (id: mongoose.Types.ObjectId) => id.toString() === targetUserId
        );
        if (!isFollowing) {
            throw new ConflictException("You are not following this user");
        }
        await this.userRepository.findByIdAndUpdate({
            id: currentUser._id,
            update: { $pull: { following: new mongoose.Types.ObjectId(targetUserId) } }
        });
        await this.userRepository.findByIdAndUpdate({
            id: new mongoose.Types.ObjectId(targetUserId),
            update: { $pull: { followers: currentUser._id } }
        });
        return { message: "User unfollowed successfully" };
    }


    async searchUsers(query: string, currentUserId: mongoose.Types.ObjectId, page: number = 1, limit: number = 10) {
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const searchRegex = new RegExp(escapedQuery, "i");
        const filter = {
            _id: { $ne: currentUserId },
            $or: [
                { firstName: searchRegex },
                { lastName: searchRegex },
                {
                    $expr: {
                        $regexMatch: {
                            input: { $concat: ["$firstName", " ", "$lastName"] },
                            regex: escapedQuery,
                            options: "i"
                        }
                    }
                },
            ]
        };
        const result = await this.userRepository.paginate({filter,page,limit,
            options: {
                select: "firstName lastName email image gender profileVisibility",
            }});
        return result;
    }

    async getSuggestions(currentUser: HydratedDocument<IUser>, page: number = 1, limit: number = 10) {
        const followingIds = currentUser.following || [];
        const excludeIds = [currentUser._id, ...followingIds];
        const filter = {
            _id: { $nin: excludeIds },
        };
        const result = await this.userRepository.paginate({filter,page,limit,
            options: {
                select: "firstName lastName email image gender profileVisibility",
            }
        });
        return result;
    }

    async getSettings(user: HydratedDocument<IUser>) {
        const account = await this.userRepository.findById({
            id: user._id,
            projection: { email: 1, firstName: 1, lastName: 1, gender: 1, phone: 1, DOB: 1, twoStepVerification: 1, profileVisibility: 1, provider: 1 },
            options: { lean: false }
        });
        if (!account) throw new NotfoundException("User not found");
        return account;
    }

    async updateSettings(user: HydratedDocument<IUser>, data: {
        profileVisibility?: number;
    }) {
        const updated = await this.userRepository.findByIdAndUpdate({
            id: user._id,
            update: { $set: data },
            options: { projection: { email: 1, firstName: 1, lastName: 1, gender: 1, phone: 1, DOB: 1, twoStepVerification: 1, profileVisibility: 1, provider: 1 } }
        });
        if (!updated) throw new NotfoundException("User not found");
        return updated;
    }
}


export const userService = new UserService()