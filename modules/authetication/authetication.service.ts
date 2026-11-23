import bcrypt from "bcrypt";
import { IUser } from "../../common/interface";
import { ConfirmEmailDto, LoginDto, ResendConfirmEmailDto, ResetPasswordDto, SignupDto } from "./dto/authentication.dto";
import { BadRequestException, ConflictException, NotfoundException, TooManyRequestException } from "../../common/exception";
import { UserRepository } from "../../common/repository";
import {cacheService, CacheService, notificationService, NotificationService } from "../../common/service";
import { EmailSubjectEnum, ProviderEnum, TwoStepVerificationEnum } from "../../common/enum";
import { emailEvent, userEmailKey, userEmailTrailsKey } from "../../common/utils/email";
import { createOtp } from "../../common/utils";
import { compare, encryption, hash } from "../../common/security";
import { tokenService, TokenService } from "../../common/service";
import { ILoginResponse, iLoginWithGmailResponse } from "./entities/authentication.entity";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import { WEB_CLIENT_IDS } from "../../config";

export class AuthenticationService {
    private userRepository : UserRepository
    private cacheService : CacheService
    private tokenService : TokenService
    private notificationService : NotificationService
    private client : OAuth2Client
    constructor() {
        this.cacheService = cacheService
        this.userRepository = new UserRepository()
        this.tokenService = tokenService
        this.client = new OAuth2Client();
        this.notificationService = notificationService
    }


    async verifyGoogleAccount(idToken:string):Promise<TokenPayload> {
        if (!idToken) {
            throw new BadRequestException("Google ID token is required");
        }
        const audience = WEB_CLIENT_IDS?.includes(",") ? WEB_CLIENT_IDS.split(",").map((id) => id.trim()).filter(Boolean) : WEB_CLIENT_IDS;
        let ticket;
        try {
            ticket = await this.client.verifyIdToken({idToken,audience});
        } catch (error) {
            throw new BadRequestException((error as Error).message || "Invalid Google ID token");
        }
        const payload = ticket.getPayload();
        if (!payload?.email_verified) {
            throw new BadRequestException("Email is not verified");
        }
        return payload;
    }



    async LoginWithGmail({ idToken }:{ idToken:string }, issuer:string):Promise<iLoginWithGmailResponse>{
        const { name, email, picture } = await this.verifyGoogleAccount(idToken);
        const existAccount = await this.userRepository.findOne({
            filter: { email:email as string },
        });
        let user = existAccount;
        if (existAccount) {
            if (existAccount.provider !== ProviderEnum.GOOGLE) {
                throw new ConflictException("invalid account provider");
            }
            if (!existAccount.image && picture) {
                existAccount.image = picture;
                await existAccount.save();
            }
        } else {
            const cleanName = (name || "Google User").trim();
            const parts = cleanName.split(/\s+/).filter(Boolean);
            let firstName = parts[0] || "Google";
            let lastName = parts.slice(1).join(" ") || "User";
            if (firstName.length < 2) firstName = `${firstName}_`;
            if (lastName.length < 2) lastName = `${lastName}_`;
            user = await this.userRepository.createOne({      
                data: {firstName,lastName,email,confirmEmail: new Date(),provider: ProviderEnum.GOOGLE,image: picture}
            });
        }
        if (!user) {
            throw new NotfoundException("Failed to create or retrieve user");
        }
        return {status:201, data:await this.tokenService.createLoginCredentials({ user, issuer })};
    };



    async sendEmailOtp ({email,subject,expiresIn=120,maxTrails=3, blockInSeconds=300,title}:{email:string, subject:EmailSubjectEnum ,expiresIn?:number ,maxTrails?:number, blockInSeconds?:number,title:string}) {
        const existOTP_TTL = await this.cacheService.ttl({ key: userEmailKey({ email, subject }) })
        if (existOTP_TTL > 0) {
            throw new ConflictException(`Sorry we cannot create new otp while existing one is still valid, please wait for ${existOTP_TTL} seconds`)
        }
        const oldTrails = await this.cacheService.get({ key: userEmailTrailsKey({ email, subject }) }) ?? 0
        if (oldTrails >= maxTrails) {
            throw new TooManyRequestException(`Maximum resend attempts reached`)
        }
        const code = createOtp();
        await this.cacheService.set({
            key: userEmailKey({ email, subject}),
            value: await hash(code.toString()),
            ttl: expiresIn
        })
        const currentTrails = await this.cacheService.incrBy({ key: userEmailTrailsKey({ email, subject }) })
        if(currentTrails === 3){
            await this.cacheService.expire({ key: userEmailTrailsKey({ email, subject }), ttl: blockInSeconds })
        }
        emailEvent.emit("sendEmail", { recipients: { to: email }, subject, data: { code,title:title ?? subject } })
    }



    async signup ({ email, password, phone, username }:SignupDto['body']):Promise<IUser>  {
        const duplicatedAccount = await this.userRepository.findOne({
            filter: { email },
            options: { select: "email" }
        })
        if (duplicatedAccount) throw new ConflictException("Email already exists")
        const account = await this.userRepository.createOne({
            data: { email, password: await hash(password), phone: await encryption(phone), username }
        })
        await this.sendEmailOtp({email,subject:EmailSubjectEnum.CONFIRM_EMAIL,title:EmailSubjectEnum.CONFIRM_EMAIL})
        return account
    }



    async confirmEmail ({ otp, email }:ConfirmEmailDto):Promise<void> {
        const account = await this.userRepository.findOne({
            filter: { email, provider: ProviderEnum.SYSTEM, confirmEmail: { $exists: false } },
            options:{lean:false}
        })
        if (!account) throw new NotfoundException("Invalid account")
        const hashOtp = await this.cacheService.get({ key: userEmailKey({ email, subject: EmailSubjectEnum.CONFIRM_EMAIL }) })
        if (!hashOtp || !await compare(otp, hashOtp)) {
            throw new ConflictException("Invalid OTP")
        }
        account.confirmEmail = new Date() as unknown as string
        await account.save()
        await this.cacheService.del({ key: await this.cacheService.keys({ prefix: userEmailKey({ email, subject: EmailSubjectEnum.CONFIRM_EMAIL }) }) })
        return
    }



    async resendConfirmEmail ({ email }:ResendConfirmEmailDto):Promise<void> {
        const account = await this.userRepository.findOne({
            filter: { email, provider: ProviderEnum.SYSTEM, confirmEmail: { $exists: false } }
        })
        if (!account) throw new NotfoundException("Invalid account")
        await this.sendEmailOtp({email,subject:EmailSubjectEnum.CONFIRM_EMAIL,title:EmailSubjectEnum.CONFIRM_EMAIL})
        return
    }


    async login({ email, password, FCM }: LoginDto, issuer: string):Promise<ILoginResponse> {
        const account = await this.userRepository.findOne({
            filter: {email, provider: ProviderEnum.SYSTEM, confirmEmail: { $exists: true }}
        });
        if (!account?.password) {
            throw new NotfoundException("Invalid email or password");
        }
        const match = await bcrypt.compare(password, account.password);
        if (!match) {
            throw new NotfoundException("Invalid email or password");
        }

        
        await this.notificationService.sendNotifications({
            tokens:await this.notificationService.getFCMs({userId: account._id }),
            notification:{
                title:"login session",
                body:"new device login !"
            }
        })
        if(FCM){
            await this.notificationService.addFCM({userId: account._id , FCM})
        }


        if (account.twoStepVerification === TwoStepVerificationEnum.ENABLED) {
            await this.sendEmailOtp({
                email: account.email,
                subject: EmailSubjectEnum.TWO_STEP_VERIFICATION,
                title: "Two Step Verification"
            });
            return {
                twoStepVerification: true,
                message: "Verification code sent to your email"
            };
        }
        return await this.tokenService.createLoginCredentials({user: account,issuer});
    }


    async requestForgotPassword({ email }: ResendConfirmEmailDto): Promise<void> {
        const account = await this.userRepository.findOne({
            filter: {
                email,
                provider: ProviderEnum.SYSTEM,
                confirmEmail: { $exists: true }
            }
        });
        if (!account) throw new NotfoundException("Invalid account");

        await this.sendEmailOtp({
            email,
            subject: EmailSubjectEnum.FORGET_PASSWORD,
            title: EmailSubjectEnum.FORGET_PASSWORD
        });
        return;
    }


    private async getVerifiedForgotPasswordAccount({ otp, email }: ConfirmEmailDto) {
        const account = await this.userRepository.findOne({
            filter: {
                email,
                provider: ProviderEnum.SYSTEM,
                confirmEmail: { $exists: true }
            },
            options: { lean: false }
        });
        if (!account) throw new NotfoundException("Invalid account");

        const hashOtp = await this.cacheService.get({
            key: userEmailKey({
                email,
                subject: EmailSubjectEnum.FORGET_PASSWORD
            })
        });
        if (!hashOtp || !await compare(otp, hashOtp)) {
            throw new ConflictException("Invalid OTP");
        }

        return account;
    }


    async verifyForgotPassword({ otp, email }: ConfirmEmailDto): Promise<void> {
        await this.getVerifiedForgotPasswordAccount({ otp, email });
        return;
    }


    async resetPassword({ otp, email, password }: ResetPasswordDto): Promise<void> {
        const account = await this.getVerifiedForgotPasswordAccount({ otp, email });

        account.password = await hash(password);
        account.changeCredentialsTime = new Date();

        await account.save();

        const result = await Promise.all([
            this.cacheService.keys({
                prefix: tokenService.userBaseRevokeTokenKey({
                    userId: account._id
                })
            }),
            this.cacheService.keys({
                prefix: userEmailKey({
                    email,
                    subject: EmailSubjectEnum.FORGET_PASSWORD
                })
            })
        ]);

        await this.cacheService.del({
            key: [...result[0], ...result[1]]
        });

        await this.notificationService.removeFCMUser({ userId: account._id });

        return;
    }

}


export default new AuthenticationService()