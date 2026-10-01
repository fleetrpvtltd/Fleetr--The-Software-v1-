import mongoose, { Document, Schema } from 'mongoose';

export interface ILorryReceipt extends Document {
  orderId: mongoose.Types.ObjectId;
  lrNumber: string;
  carrierRegistrationNumber: string;
  transporterGSTIN: string;
  consignor: { name: string; gstin: string; address: string; phone: string; };
  consignee: { name: string; gstin: string; address: string; phone: string; };
  cargoManifest: Array<{ description: string; quantity: number; weightKg: number; hsn?: string; }>;
  ewayBillNo?: string;
  totalWeight: number;
  freightCharges: number;
  generatedPdfUrl?: string;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LorryReceiptSchema = new Schema<ILorryReceipt>({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
  lrNumber: { type: String, required: true, unique: true },
  carrierRegistrationNumber: { type: String, required: true },
  transporterGSTIN: { type: String, required: true },
  consignor: {
    name: { type: String, required: true },
    gstin: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true }
  },
  consignee: {
    name: { type: String, required: true },
    gstin: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true }
  },
  cargoManifest: [{
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    weightKg: { type: Number, required: true },
    hsn: { type: String }
  }],
  ewayBillNo: { type: String },
  totalWeight: { type: Number, required: true },
  freightCharges: { type: Number, required: true },
  generatedPdfUrl: { type: String },
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

/**
 * LorryReceipt Model
 */
export const LorryReceipt = mongoose.model<ILorryReceipt>('LorryReceipt', LorryReceiptSchema);
