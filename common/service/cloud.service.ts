import { CompleteMultipartUploadCommandOutput, DeleteObjectCommand, DeleteObjectCommandOutput, DeleteObjectsCommand, DeleteObjectsCommandOutput, GetObjectCommand, GetObjectCommandOutput, ListObjectsV2Command, ListObjectsV2CommandOutput, ObjectCannedACL, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {APP_NAME, AWS_ACCESS_KEY_ID,AWS_ACCESS_SECRET_KEY,AWS_BUCKET_NAME,AWS_REGION, AWS_S3_EXPIRES_IN} from "../../config";
import { randomUUID } from "node:crypto";
import { BadRequestException } from "../exception/domain.exception.js";
import { IFile } from "../types/multer.types.js";
import { Progress, Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class CloudService {
    private readonly client: S3Client;
    constructor() {
        this.client = new S3Client({
            region: AWS_REGION,
            credentials: {
                accessKeyId: AWS_ACCESS_KEY_ID,
                secretAccessKey: AWS_ACCESS_SECRET_KEY
            }
        });
    }
    private generateKey({ path = "public", file }: { path?: string; file: IFile }) {
        return `${APP_NAME}/${path}/${randomUUID()}_${file.originalname}`;
    }


    async createPreSignedUploadAssetLink({
        Bucket = AWS_BUCKET_NAME,
        path = "public",
        ContentType,
        Originalname,
        expiresIn=AWS_S3_EXPIRES_IN
    }: {
        Bucket?: string;
        path?: string;
        ContentType: string;
        Originalname: string;
        expiresIn?:number
    }): Promise<{url:string,Key:string}> {
        const command = new PutObjectCommand({
            Bucket,
            Key: this.generateKey({
                path,
                file: { originalname: Originalname } as IFile
            }),
            ContentType
        });
        if (!command.input.Key) {
            throw new BadRequestException("Fail to upload this asset");
        }
        const url = await getSignedUrl(this.client,command,{expiresIn})
        return {url,Key:command.input.Key};
    }

    async uploadAsset({
        file,
        ACL = ObjectCannedACL.private,
        Bucket = AWS_BUCKET_NAME,
        path = "public"
    }: {
        Bucket?: string;
        ACL?: ObjectCannedACL;
        path?: string;
        file: IFile;
    }): Promise<string> {
        const command = new PutObjectCommand({
            Bucket,
            Key: this.generateKey({ path, file }),
            ACL,
            Body: file.buffer,
            ContentType: file.mimetype
        });
        if(!command.input.Key){
            throw new BadRequestException("Fail to upload this asset")
        }
        await this.client.send(command)
        return command.input.Key
    }


    async uploadLargeAsset({
        file,
        ACL = ObjectCannedACL.private,
        Bucket = AWS_BUCKET_NAME,
        path = "public",
        partSize = 5
    }: {
        Bucket?: string;
        ACL?: ObjectCannedACL;
        path?: string;
        partSize?: number;
        file: IFile;
    }): Promise<CompleteMultipartUploadCommandOutput> {
        const upload = new Upload({
            client: this.client,
            params: {
                Bucket,
                Key: this.generateKey({ path, file }),
                ACL,
                Body: file.buffer,
                ContentType: file.mimetype
            },
            partSize: partSize * 1024 * 1024
        });
        upload.on("httpUploadProgress", (progress: Progress) => {
            console.log(
                `File upload is ${(progress.loaded as number) / (progress.total as number) * 100}%`
            );
        });
        return await upload.done();
    }


    async uploadAssets({
        files,
        ACL = ObjectCannedACL.private,
        Bucket = AWS_BUCKET_NAME,
        path = "public"
    }: {
        Bucket?: string;
        ACL?: ObjectCannedACL;
        path?: string;
        files: IFile[];
    }): Promise<string[]> {
        return await Promise.all( files.map((file) => this.uploadAsset({ file, ACL, Bucket, path }) ) );
    }


    async uploadLargeAssets({
        files,
        ACL = ObjectCannedACL.private,
        Bucket = AWS_BUCKET_NAME,
        path = "public",
        partSize = 5
    }: {
        Bucket?: string;
        ACL?: ObjectCannedACL;
        path?: string;
        files: IFile[];
        partSize?: number;
    }): Promise<string[]> {
        const result = await Promise.all(
            files.map((file) =>
                this.uploadLargeAsset({
                    file,
                    ACL,
                    Bucket,
                    path,
                    partSize
                })
            )
        );
        return result.map((ele) => ele.Key as string);
    }


    async createPreSignedFetchAssetLink({
        Bucket = AWS_BUCKET_NAME,
        Key,
        expiresIn = AWS_S3_EXPIRES_IN,
        download = 'false',
        filename
    }: {
        Bucket?: string;
        Key: string;
        expiresIn?: number;
        download?: 'true' | 'false';
        filename?: string | undefined;
    }): Promise<string> {
        const command = new GetObjectCommand({
            Bucket,
            Key,
            ResponseContentDisposition: download === "true" ? `attachment; filename="${filename}"` : undefined
        });
        return await getSignedUrl(this.client, command, { expiresIn });
    }


    async getAsset({
        Bucket = AWS_BUCKET_NAME,
        Key
    }: {
        Bucket?: string;
        Key: string;
    }): Promise<GetObjectCommandOutput> {
        const command = new GetObjectCommand({
            Bucket,
            Key
        });
        return await this.client.send(command);
    }


    //replace 1
    async deleteAsset({
        Bucket = AWS_BUCKET_NAME,
        Key
    }: {
        Bucket?: string;
        Key: string;
    }): Promise<DeleteObjectCommandOutput> {
        const command = new DeleteObjectCommand({
            Bucket,
            Key
        });
        return await this.client.send(command);
    }


    //replace many
    async deleteAssets({
        Bucket = AWS_BUCKET_NAME,
        Keys
    }: {
        Bucket?: string;
        Keys: string[];
    }): Promise<DeleteObjectsCommandOutput> {
        const command = new DeleteObjectsCommand({
            Bucket,
            Delete:{
                Objects: Keys.map(key => {return {  Key : key } })
            }
        });
        return await this.client.send(command);
    }


    async listFolderDirs({ 
        Bucket = AWS_BUCKET_NAME,
        Prefix 
    }: { 
        Bucket?: string,
        Prefix: string 
    }): Promise<ListObjectsV2CommandOutput> {
        const command = new ListObjectsV2Command({ Bucket, Prefix: `${APP_NAME}/${Prefix}` })
        return await this.client.send(command)
    }
    
    
    async deleteFolderByPrefix({ 
        Bucket = AWS_BUCKET_NAME,
        Prefix 
    }: { 
        Bucket?: string,
        Prefix: string 
    }): Promise<DeleteObjectsCommandOutput> {
        const { Contents } = await this.listFolderDirs({ Bucket, Prefix })
        const Keys = Contents?.map((ele) => ele.Key as string) || []
        return await this.deleteAssets({ Keys, Bucket })
    }
}

export const cloudService = new CloudService()