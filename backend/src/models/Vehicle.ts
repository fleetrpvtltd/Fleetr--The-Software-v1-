import mongoose, { Document, Schema } from 'mongoose';

export interface IVehicle extends Document {
  registrationNumber: string;
  ownerId: mongoose.Types.ObjectId;
  vehicleType: 'LCV' | 'ICV' | 'HCV' | 'MULTI_AXLE' | 'TRAILER' | 'TANKER' | 'REFRIGERATED' | 'OPEN_BODY' | 'CLOSED_BODY' | 'FLATBED';
  vahanData?: {
    rc_status: string;
    rc_fit_upto: Date;
    rc_gvw: number;
    rc_unld_wt: number;
    rc_vch_catg: string;
    rc_maker_desc: string;
    rc_model: string;
    rc_fuel_desc: string;
    rc_norms_desc: string;
    rc_insurance_upto: Date;
    lastVerifiedAt: Date;
  };
  payloadCapacity: number;
  fastagData?: {
    tagId: string;
    tagStatus: 'A' | 'I' | 'B';
    comVehicle: boolean;
    excCode: string;
    walletBalance: number;
    lastCheckedAt: Date;
  };
  dimensions?: {
    lengthCm: number;
    widthCm: number;
    heightCm: number;
  };
  isAvailable: boolean;
  isComplianceCleared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema = new Schema<IVehicle>({
  registrationNumber: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true, 
    index: true,
    match: /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$/ 
  },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  vehicleType: { type: String, enum: ['LCV', 'ICV', 'HCV', 'MULTI_AXLE', 'TRAILER', 'TANKER', 'REFRIGERATED', 'OPEN_BODY', 'CLOSED_BODY', 'FLATBED'], required: true },
  vahanData: {
    rc_status: String,
    rc_fit_upto: Date,
    rc_gvw: Number,
    rc_unld_wt: Number,
    rc_vch_catg: String,
    rc_maker_desc: String,
    rc_model: String,
    rc_fuel_desc: String,
    rc_norms_desc: String,
    rc_insurance_upto: Date,
    lastVerifiedAt: Date
  },
  payloadCapacity: { type: Number, default: 0 },
  fastagData: {
    tagId: String,
    tagStatus: { type: String, enum: ['A', 'I', 'B'] },
    comVehicle: Boolean,
    excCode: String,
    walletBalance: Number,
    lastCheckedAt: Date
  },
  dimensions: {
    lengthCm: Number,
    widthCm: Number,
    heightCm: Number
  },
  isAvailable: { type: Boolean, default: true, index: true },
  isComplianceCleared: { type: Boolean, default: false }
}, { timestamps: true });

VehicleSchema.pre('save', function(next) {
  if (this.isModified('vahanData') && this.vahanData) {
    this.payloadCapacity = (this.vahanData.rc_gvw || 0) - (this.vahanData.rc_unld_wt || 0);
  }
  next();
});

/**
 * Vehicle Model
 */
export const Vehicle = mongoose.model<IVehicle>('Vehicle', VehicleSchema);
