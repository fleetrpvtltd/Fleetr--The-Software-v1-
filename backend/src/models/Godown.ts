import mongoose, { Document, Schema } from 'mongoose';

export interface IGodown extends Document {
  name: string;
  ownerId: mongoose.Types.ObjectId;
  address: {
    line1: string;
    line2?: string;
    city: string;
    district: string;
    state: string;
    pincode: string;
  };
  totalCapacityCFT: number;
  usedCapacityCFT: number;
  totalCapacitySQFT?: number;
  ratePerUnit?: number;
  facilityType: 'COLD_STORAGE' | 'DRY_STORAGE' | 'BONDED' | 'OPEN_YARD' | 'GENERAL';
  isActive: boolean;
  availableCapacityCFT: number;
  occupancyPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

const GodownSchema = new Schema<IGodown>({
  name: { type: String, required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  address: {
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    district: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true }
  },
  totalCapacityCFT: { type: Number, required: true, min: 0 },
  usedCapacityCFT: { type: Number, default: 0, min: 0 },
  totalCapacitySQFT: { type: Number },
  ratePerUnit: { type: Number, min: 0 },
  facilityType: { type: String, enum: ['COLD_STORAGE', 'DRY_STORAGE', 'BONDED', 'OPEN_YARD', 'GENERAL'], default: 'GENERAL' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

GodownSchema.virtual('availableCapacityCFT').get(function(this: IGodown) {
  return this.totalCapacityCFT - this.usedCapacityCFT;
});

GodownSchema.virtual('occupancyPercent').get(function(this: IGodown) {
  return this.totalCapacityCFT > 0 ? (this.usedCapacityCFT / this.totalCapacityCFT) * 100 : 0;
});

/**
 * Godown Model
 */
export const Godown = mongoose.model<IGodown>('Godown', GodownSchema);
