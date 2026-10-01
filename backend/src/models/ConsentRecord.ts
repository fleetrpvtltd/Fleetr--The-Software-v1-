import mongoose, { Document, Schema } from 'mongoose';

export interface IConsentRecord extends Document {
  userId: mongoose.Types.ObjectId;
  purpose: 'VAHAN_LOOKUP' | 'SARATHI_LOOKUP' | 'GPS_TRACKING' | 'FASTAG_TRACKING' | 'PII_PROCESSING';
  consentHash: string;
  consentText: string;
  grantedAt: Date;
  withdrawnAt?: Date;
  isActive: boolean;
  ipAddress?: string;
  userAgent?: string;
  isValid: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ConsentRecordSchema = new Schema<IConsentRecord>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  purpose: { type: String, enum: ['VAHAN_LOOKUP', 'SARATHI_LOOKUP', 'GPS_TRACKING', 'FASTAG_TRACKING', 'PII_PROCESSING'], required: true },
  consentHash: { type: String, required: true },
  consentText: { type: String, required: true },
  grantedAt: { type: Date, required: true, default: Date.now },
  withdrawnAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  ipAddress: { type: String },
  userAgent: { type: String }
}, { timestamps: true });

ConsentRecordSchema.index({ userId: 1, purpose: 1 });
ConsentRecordSchema.index({ isActive: 1 });

ConsentRecordSchema.virtual('isValid').get(function(this: IConsentRecord) {
  return this.isActive && !this.withdrawnAt;
});

/**
 * ConsentRecord Model
 */
export const ConsentRecord = mongoose.model<IConsentRecord>('ConsentRecord', ConsentRecordSchema);
