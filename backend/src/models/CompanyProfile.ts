import mongoose, { Document, Schema } from 'mongoose';

export interface ICompanyProfile extends Document {
  userId: mongoose.Types.ObjectId;
  companyName: string;
  gstin: string;
  pan?: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: 'India';
  };
  carriageCount: number;
  form15GH?: {
    filed: boolean;
    documentUrl?: string;
    validUntil?: Date;
  };
  bankDetails?: {
    accountNumber: string;
    ifsc: string;
    bankName: string;
    accountHolderName: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const CompanyProfileSchema = new Schema<ICompanyProfile>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  companyName: { type: String, required: true },
  gstin: { type: String, required: true }, // Add further validation if needed
  pan: {
    type: String,
    validate: {
      validator: (v: string) => !v || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v),
      message: 'Invalid PAN'
    }
  },
  address: {
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, enum: ['India'], required: true, default: 'India' }
  },
  carriageCount: { type: Number, default: 0, min: 0 },
  form15GH: {
    filed: { type: Boolean, default: false },
    documentUrl: { type: String },
    validUntil: { type: Date }
  },
  bankDetails: {
    accountNumber: { type: String },
    ifsc: { type: String },
    bankName: { type: String },
    accountHolderName: { type: String }
  }
}, { timestamps: true });

/**
 * CompanyProfile Model
 */
export const CompanyProfile = mongoose.model<ICompanyProfile>('CompanyProfile', CompanyProfileSchema);
