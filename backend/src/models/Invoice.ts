import mongoose, { Document, Schema } from 'mongoose';

export interface IInvoice extends Document {
  invoiceNumber: string;
  orderId: mongoose.Types.ObjectId;
  lrId?: mongoose.Types.ObjectId;
  businessOwnerId: mongoose.Types.ObjectId;
  transporterId: mongoose.Types.ObjectId;
  freightCharges: number;
  gstRate: number;
  gstAmount: number;
  tdsRate: number;
  tdsAmount: number;
  tdsSection?: string;
  totalPayable: number;
  dueDate?: Date;
  paidAt?: Date;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>({
  invoiceNumber: { type: String, required: true, unique: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  lrId: { type: Schema.Types.ObjectId, ref: 'LorryReceipt' },
  businessOwnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  transporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  freightCharges: { type: Number, required: true },
  gstRate: { type: Number, default: 18 },
  gstAmount: { type: Number, required: true },
  tdsRate: { type: Number, default: 0 },
  tdsAmount: { type: Number, default: 0 },
  tdsSection: { type: String },
  totalPayable: { type: Number, required: true },
  dueDate: { type: Date },
  paidAt: { type: Date },
  status: { type: String, enum: ['DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'CANCELLED'], default: 'DRAFT' }
}, { timestamps: true });

InvoiceSchema.pre('validate', function(next) {
  if (this.isModified('freightCharges') || this.isModified('gstRate') || this.isModified('tdsRate')) {
    this.gstAmount = (this.freightCharges * this.gstRate) / 100;
    this.tdsAmount = (this.freightCharges * this.tdsRate) / 100;
    this.totalPayable = this.freightCharges + this.gstAmount - this.tdsAmount;
  }
  next();
});

/**
 * Invoice Model
 */
export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
