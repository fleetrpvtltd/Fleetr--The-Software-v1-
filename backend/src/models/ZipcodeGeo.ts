import mongoose, { Document, Schema } from 'mongoose';

export interface IZipcodeGeo extends Document {
  pincode: string;
  lat: number;
  lng: number;
  district: string;
  state: string;
  region?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ZipcodeGeoSchema = new Schema<IZipcodeGeo>({
  pincode: { 
    type: String, 
    required: true, 
    unique: true,
    match: /^[1-9][0-9]{5}$/
  },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  district: { type: String, required: true },
  state: { type: String, required: true },
  region: { type: String }
}, { timestamps: true });

ZipcodeGeoSchema.index({ state: 1 });

/**
 * ZipcodeGeo Model
 */
export const ZipcodeGeo = mongoose.model<IZipcodeGeo>('ZipcodeGeo', ZipcodeGeoSchema);
