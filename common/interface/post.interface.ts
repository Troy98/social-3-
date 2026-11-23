import mongoose from "mongoose";

export interface IPost {
    _id?: mongoose.Types.ObjectId;
    content?: string | undefined;
    attachments?: string[] | undefined;
    userId: mongoose.Types.ObjectId;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
}
