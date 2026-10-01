import mongoose, { Document, Schema } from 'mongoose';

export interface IBreachLog extends Document {
  userId: mongoose.Types.ObjectId;
  accessedResource: string;
  accessType: 'UNAUTHORIZED_VIEW' | 'UNAUTHORIZED_EXPORT' | 'UNAUTHORIZED_MODIFICATION' | 'CONSENT_VIOLATION' | 'EXCESSIVE_ACCESS';
  flagReason: string;
  sourceIp?: string;
  userAgent?: string;
  reportedToAuthority: boolean;
  reportedAt?: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  resolved: boolean;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BreachLogSchema = new Schema<IBreachLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  accessedResource: { type: String, required: true },
  accessType: { type: String, enum: ['UNAUTHORIZED_VIEW', 'UNAUTHORIZED_EXPORT', 'UNAUTHORIZED_MODIFICATION', 'CONSENT_VIOLATION', 'EXCESSIVE_ACCESS'], required: true },
  flagReason: { type: String, required: true },
  sourceIp: { type: String },
  userAgent: { type: String },
  reportedToAuthority: { type: Boolean, default: false },
  reportedAt: { type: Date },
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM', index: true },
  resolved: { type: Boolean, default: false, index: true },
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date }
}, { timestamps: true });

BreachLogSchema.index({ createdAt: -1 });

/**
 * BreachLog Model
 */
export const BreachLog = mongoose.model<IBreachLog>('BreachLog', BreachLogSchema);
