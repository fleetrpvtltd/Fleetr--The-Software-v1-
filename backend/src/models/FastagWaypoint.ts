import mongoose, { Document, Schema } from 'mongoose';

export interface IFastagWaypoint extends Document {
  vehicleId: mongoose.Types.ObjectId;
  seqNo: string;
  tollPlazaName: string;
  tollPlazaGeocode?: { lat: number; lng: number };
  readerReadTime: Date;
  txnAmount?: number;
  txnStatus?: string;
  laneDirection?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FastagWaypointSchema = new Schema<IFastagWaypoint>({
  vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
  seqNo: { type: String, required: true },
  tollPlazaName: { type: String, required: true },
  tollPlazaGeocode: { lat: Number, lng: Number },
  readerReadTime: { type: Date, required: true },
  txnAmount: { type: Number },
  txnStatus: { type: String },
  laneDirection: { type: String }
}, { timestamps: true });

FastagWaypointSchema.index({ vehicleId: 1, seqNo: 1 }, { unique: true });
FastagWaypointSchema.index({ vehicleId: 1, readerReadTime: -1 });

/**
 * FastagWaypoint Model
 */
export const FastagWaypoint = mongoose.model<IFastagWaypoint>('FastagWaypoint', FastagWaypointSchema);
