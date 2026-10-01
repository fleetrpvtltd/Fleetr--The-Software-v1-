import mongoose, { Document, Schema } from 'mongoose';

export interface IDriver extends Document {
  dlNumber: string;
  fullName: string;
  dob: Date;
  phone: string;
  ownerId: mongoose.Types.ObjectId;
  sarathiData?: {
    dlStatus: 'Active' | 'Suspended' | 'Revoked' | 'Expired';
    dlcovs: Array<{ covCategory: string; covIssueDate: Date }>;
    dlExpiryDate: Date;
    lastVerifiedAt: Date;
  };
  hasTransEndorsement: boolean;
  aadhaarHash?: string;
  isAvailable: boolean;
  isComplianceCleared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DriverSchema = new Schema<IDriver>({
  dlNumber: { type: String, required: true, unique: true, index: true },
  fullName: { type: String, required: true },
  dob: { type: Date, required: true },
  phone: { type: String, required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sarathiData: {
    dlStatus: { type: String, enum: ['Active', 'Suspended', 'Revoked', 'Expired'] },
    dlcovs: [{
      covCategory: String,
      covIssueDate: Date
    }],
    dlExpiryDate: Date,
    lastVerifiedAt: Date
  },
  hasTransEndorsement: { type: Boolean, default: false },
  aadhaarHash: { type: String },
  isAvailable: { type: Boolean, default: true },
  isComplianceCleared: { type: Boolean, default: false }
}, { timestamps: true });

DriverSchema.pre('save', function(next) {
  if (this.isModified('sarathiData') && this.sarathiData?.dlcovs) {
    this.hasTransEndorsement = this.sarathiData.dlcovs.some(c => c.covCategory === 'TRANS');
  }
  next();
});

/**
 * Driver Model
 */
export const Driver = mongoose.model<IDriver>('Driver', DriverSchema);
