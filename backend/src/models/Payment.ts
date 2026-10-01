import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  orderId: mongoose.Types.ObjectId;
  invoiceId: mongoose.Types.ObjectId;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  amount: number;
  currency: string;
  method?: 'CARD' | 'UPI' | 'NETBANKING' | 'WALLET' | 'NEFT' | 'RTGS';
  status: 'CREATED' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'REFUNDED';
  nonRefundableAcknowledged: boolean;
  failureReason?: string;
  capturedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  method: { type: String, enum: ['CARD', 'UPI', 'NETBANKING', 'WALLET', 'NEFT', 'RTGS'] },
  status: { type: String, enum: ['CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED'], default: 'CREATED', index: true },
  nonRefundableAcknowledged: { type: Boolean, default: false },
  failureReason: { type: String },
  capturedAt: { type: Date }
}, { timestamps: true });

/**
 * Payment Model
 */
export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
