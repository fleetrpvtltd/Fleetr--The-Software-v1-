import mongoose, { Document, Schema } from 'mongoose';

export interface IOutboxJob extends Document {
  jobType: string;
  payload: any;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  processAfter: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OutboxJobSchema = new Schema<IOutboxJob>({
  jobType: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  lastError: { type: String },
  processAfter: { type: Date, default: Date.now },
  completedAt: { type: Date }
}, { timestamps: true });

OutboxJobSchema.index({ status: 1, processAfter: 1 });
OutboxJobSchema.index({ completedAt: 1 }, { expireAfterSeconds: 604800 }); // 7 days TTL

/**
 * OutboxJob Model
 */
export const OutboxJob = mongoose.model<IOutboxJob>('OutboxJob', OutboxJobSchema);
