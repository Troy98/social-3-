import { HydratedDocument } from "mongoose";
import { BadRequestException, ForbiddenException, NotfoundException } from "../../common/exception";
import { IPost } from "../../common/interface";
import { CommentRepository, PostRepository } from "../../common/repository";
import { CloudService, cloudService } from "../../common/service";
import { IFile } from "../../common/types/multer.types.js";
import { toObjectId } from "../../common/utils";
import { HUser } from "../../DB/model";

export class PostService {
    private readonly postRepository: PostRepository;
    private readonly commentRepository: CommentRepository;
    private readonly cloudService: CloudService;

    constructor() {
        this.postRepository = new PostRepository();
        this.commentRepository = new CommentRepository();
        this.cloudService = cloudService;
    }

    async createPost(
        body: { content?: string },
        user: HUser,
        files?: IFile[]
    ): Promise<HydratedDocument<IPost>> {
        const hasContent = Boolean(body?.content && body.content.trim().length > 0);
        const hasFiles = Boolean(files && files.length > 0);

        if (!hasContent && !hasFiles) {
            throw new BadRequestException("At least content or media must be provided");
        }

        let uploadedKeys: string[] = [];
        if (hasFiles) {
            uploadedKeys = await this.cloudService.uploadAssets({
                files: files as IFile[],
                path: `Post/${user._id.toString()}`,
            });
        }

        try {
            const post = await this.postRepository.createOne({
                data: {
                    ...(hasContent ? { content: body.content!.trim() } : {}),
                    attachments: uploadedKeys,
                    userId: user._id,
                },
            });
            return post;
        } catch (error) {
            if (uploadedKeys.length > 0) {
                await this.cloudService.deleteAssets({ Keys: uploadedKeys });
            }
            throw error;
        }
    }

    async getAllPosts(user: HUser): Promise<HydratedDocument<IPost>[]> {
        const posts = await this.postRepository.find({
            filter: { userId: user._id },
            options: { sort: { createdAt: -1 } },
        });
        return posts;
    }

    async getSinglePost({ postId }: { postId: string }): Promise<HydratedDocument<IPost>> {
        const post = await this.postRepository.findById({
            id: toObjectId(postId),
        });
        if (!post) {
            throw new NotfoundException("Post not found");
        }
        return post;
    }

    async updatePost(
        { postId }: { postId: string },
        body: { content?: string; removeAttachments?: string | string[] },
        user: HUser,
        files?: IFile[]
    ): Promise<HydratedDocument<IPost>> {
        const post = await this.getSinglePost({ postId });
        if (post.userId.toString() !== user._id.toString()) {
            throw new ForbiddenException("You are not allowed to update this post");
        }

        const hasNewContent = body.content !== undefined;
        const hasNewFiles = Boolean(files && files.length > 0);
        const rawRemove = body.removeAttachments;
        const toRemove: string[] = Array.isArray(rawRemove)
            ? rawRemove
            : rawRemove
            ? [rawRemove]
            : [];

        if (!hasNewContent && !hasNewFiles && toRemove.length === 0) {
            throw new BadRequestException("At least content, new attachments, or attachments to remove must be provided");
        }

        const currentAttachments = post.attachments ?? [];
        const validKeysToDelete = currentAttachments.filter((k) => toRemove.includes(k));

        let newUploadedKeys: string[] = [];
        if (hasNewFiles) {
            newUploadedKeys = await this.cloudService.uploadAssets({
                files: files as IFile[],
                path: `Post/${user._id.toString()}`,
            });
        }

        const remainingAttachments = currentAttachments.filter((k) => !toRemove.includes(k));
        const updatedAttachments = [...remainingAttachments, ...newUploadedKeys];

        const finalContent = hasNewContent ? body.content?.trim() : post.content;
        if (!finalContent && updatedAttachments.length === 0) {
            if (newUploadedKeys.length > 0) {
                await this.cloudService.deleteAssets({ Keys: newUploadedKeys });
            }
            throw new BadRequestException("Post cannot be empty; it must have content or at least one attachment");
        }

        if (hasNewContent) {
            post.content = finalContent;
        }
        post.attachments = updatedAttachments;

        try {
            await post.save();
        } catch (error) {
            if (newUploadedKeys.length > 0) {
                await this.cloudService.deleteAssets({ Keys: newUploadedKeys });
            }
            throw error;
        }

        if (validKeysToDelete.length > 0) {
            await this.cloudService.deleteAssets({ Keys: validKeysToDelete });
        }

        return post;
    }

    async deletePost({ postId }: { postId: string }, user: HUser): Promise<void> {
        const post = await this.getSinglePost({ postId });
        if (post.userId.toString() !== user._id.toString()) {
            throw new ForbiddenException("You are not allowed to delete this post");
        }
        await this.commentRepository.deleteMany({
            filter: { postId: post._id },
        });
        await this.postRepository.deleteOne({
            filter: { _id: post._id },
        });
        if (post.attachments && post.attachments.length > 0) {
            await this.cloudService.deleteAssets({ Keys: post.attachments });
        }
        return;
    }
}

export const postService = new PostService();
