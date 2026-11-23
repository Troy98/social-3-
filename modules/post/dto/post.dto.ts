import { z } from "zod";
import { createPost, deletePost, getSinglePost, updatePost } from "../post.validation";

export type CreatePostDto = z.infer<ReturnType<typeof createPost>>["body"];
export type UpdatePostDto = z.infer<ReturnType<typeof updatePost>>["body"];
export type PostParamsDto = z.infer<ReturnType<typeof getSinglePost>>["params"];
