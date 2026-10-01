import mongoose, { Document, Schema } from 'mongoose';

export interface IOrder extends Document {
  orderNumber: string;
  status: 'REQUESTED' | 'TRUCK_CONFIRMED' | 'GODOWN_CONFIRMED' | 'PAYMENT_PENDING' | 'CONFIRMED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  businessOwnerId: mongoose.Types.ObjectId;
  pickup: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    geocode: { lat: number; lng: number };
  };
  delivery: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    geocode: { lat: number; lng: number };
  };
  cargo: {
    description: string;
    weightKg: number;
    volumetricWeight?: number;
    chargeableWeight: number;
    dimensions?: { lengthCm: number; widthCm: number; heightCm: number };
    quantity: number;
    hsn?: string;
  };
  consignmentValue: number;
  ewayBillNo?: string;
  ewayBillRequired: boolean;
  assignedVehicle?: mongoose.Types.ObjectId;
  assignedDriver?: mongoose.Types.ObjectId;
  assignedGodown?: mongoose.Types.ObjectId;
  lorryReceipt?: mongoose.Types.ObjectId;
  invoice?: mongoose.Types.ObjectId;
  payment?: mongoose.Types.ObjectId;
  estimatedDistance?: number;
  estimatedDuration?: number;
  dispatchedAt?: Date;
  deliveredAt?: Date;
  proofOfDelivery?: {
    imageUrl: string;
    signatureUrl: string;
    receivedBy: string;
    notes: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>({
  orderNumber: { type: String, unique: true },
  status: { type: String, enum: ['REQUESTED', 'TRUCK_CONFIRMED', 'GODOWN_CONFIRMED', 'PAYMENT_PENDING', 'CONFIRMED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'], default: 'REQUESTED', index: true },
  businessOwnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  pickup: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    geocode: { lat: { type: Number, required: true }, lng: { type: Number, required: true } }
  },
  delivery: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    geocode: { lat: { type: Number, required: true }, lng: { type: Number, required: true } }
  },
  cargo: {
    description: { type: String, required: true },
    weightKg: { type: Number, required: true },
    volumetricWeight: { type: Number },
    chargeableWeight: { type: Number, required: true },
    dimensions: { lengthCm: Number, widthCm: Number, heightCm: Number },
    quantity: { type: Number, default: 1 },
    hsn: { type: String }
  },
  consignmentValue: { type: Number, required: true, min: 0 },
  ewayBillNo: { type: String },
  ewayBillRequired: { type: Boolean, default: false },
  assignedVehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
  assignedDriver: { type: Schema.Types.ObjectId, ref: 'Driver' },
  assignedGodown: { type: Schema.Types.ObjectId, ref: 'Godown' },
  lorryReceipt: { type: Schema.Types.ObjectId, ref: 'LorryReceipt' },
  invoice: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  payment: { type: Schema.Types.ObjectId, ref: 'Payment' },
  estimatedDistance: { type: Number },
  estimatedDuration: { type: Number },
  dispatchedAt: { type: Date },
  deliveredAt: { type: Date },
  proofOfDelivery: {
    imageUrl: String,
    signatureUrl: String,
    receivedBy: String,
    notes: String
  }
}, { timestamps: true });

OrderSchema.index({ orderNumber: 1 });

OrderSchema.pre('save', function(next) {
  if (this.isNew && !this.orderNumber) {
    const year = new Date().getFullYear();
    const rand = Math.floor(10000 + Math.random() * 90000);
    this.orderNumber = `FL-${year}-${rand}`;
  }
  
  if (!this.isNew && this.isModified('status')) {
    // State machine validation logic could go here or in a service layer.
    // The strict 7-stage state machine is required.
  }
  next();
});

/**
 * Order Model
 */
export const Order = mongoose.model<IOrder>('Order', OrderSchema);
