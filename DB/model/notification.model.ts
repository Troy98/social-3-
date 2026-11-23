import mongoose, { HydratedDocument } from "mongoose";
import { INotification } from "../../common/interface";
import { NotificationTypeEnum } from "../../common/enum";

const notificationSchema = new mongoose.Schema<INotification>({
    recipient_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    sender_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: Object.values(NotificationTypeEnum),
        required: true,
    },
    target_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
    },
    is_read: {
        type: Boolean,
        default: false,
        index: true,
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
    strict: true,
    strictQuery: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

notificationSchema.virtual("notification_id").get(function () {
    return this._id;
});

export const NotificationModel = mongoose.models.Notification || mongoose.model<INotification>("Notification", notificationSchema);
export type HNotification = HydratedDocument<INotification>;
