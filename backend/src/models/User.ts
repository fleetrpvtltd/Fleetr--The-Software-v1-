import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  firebaseUid: string;
  email: string;
  phone?: string;
  displayName?: string;
  role: 'ADMIN' | 'BUSINESS_OWNER' | 'VEHICLE_OWNER' | 'WAREHOUSE_OWNER';
  gstin?: string;
  companyProfile?: mongoose.Types.ObjectId;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  firebaseUid: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  displayName: { type: String },
  role: { type: String, enum: ['ADMIN', 'BUSINESS_OWNER', 'VEHICLE_OWNER', 'WAREHOUSE_OWNER'], required: true, index: true },
  gstin: {
    type: String,
    validate: {
      validator: (v: string) => !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v),
      message: 'Invalid GSTIN'
    }
  },
  companyProfile: { type: Schema.Types.ObjectId, ref: 'CompanyProfile' },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date }
}, { timestamps: true });

UserSchema.index({ email: 1 });

/**
 * User Model
 */
export const User = mongoose.model<IUser>('User', UserSchema);
