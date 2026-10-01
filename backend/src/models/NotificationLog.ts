import mongoose, { Document, Schema } from 'mongoose';

export interface INotificationLog extends Document {
  recipientId: mongoose.Types.ObjectId;
  recipientPhone?: string;
  recipientEmail?: string;
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL' | 'PUSH';
  templateId?: string;
  dlHeaderId?: string;
  contentPreview?: string;
  status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BLOCKED';
  providerResponse?: any;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationLogSchema = new Schema<INotificationLog>({
  recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recipientPhone: { type: String },
  recipientEmail: { type: String },
  channel: { type: String, enum: ['SMS', 'WHATSAPP', 'EMAIL', 'PUSH'], required: true },
  templateId: { type: String },
  dlHeaderId: { type: String },
  contentPreview: { type: String },
  status: { type: String, enum: ['QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'BLOCKED'], default: 'QUEUED' },
  providerResponse: { type: Schema.Types.Mixed },
  failureReason: { type: String }
}, { timestamps: true });

/**
 * NotificationLog Model
 */
export const NotificationLog = mongoose.model<INotificationLog>('NotificationLog', NotificationLogSchema);
