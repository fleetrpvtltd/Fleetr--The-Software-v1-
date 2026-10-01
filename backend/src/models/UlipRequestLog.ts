import mongoose, { Document, Schema } from 'mongoose';

export interface IUlipRequestLog extends Document {
  apiEndpoint: string;
  requestPayload: any;
  responseStatus: number;
  responseCode?: string;
  responseData?: any;
  latencyMs?: number;
  userId?: mongoose.Types.ObjectId;
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UlipRequestLogSchema = new Schema<IUlipRequestLog>({
  apiEndpoint: { type: String, required: true },
  requestPayload: { type: Schema.Types.Mixed, required: true },
  responseStatus: { type: Number, required: true },
  responseCode: { type: String },
  responseData: { type: Schema.Types.Mixed },
  latencyMs: { type: Number },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  success: { type: Boolean, required: true },
  errorMessage: { type: String }
}, { timestamps: true });

UlipRequestLogSchema.index({ apiEndpoint: 1, createdAt: -1 });
UlipRequestLogSchema.index({ userId: 1 });
UlipRequestLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL

/**
 * UlipRequestLog Model
 */
export const UlipRequestLog = mongoose.model<IUlipRequestLog>('UlipRequestLog', UlipRequestLogSchema);
