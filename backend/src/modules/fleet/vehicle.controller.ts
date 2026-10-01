import { Request, Response, NextFunction } from 'express';
import { Vehicle } from '../../models/Vehicle.js';
import { AuditLog } from '../../models/AuditLog.js';
import { maskPii } from '../../utils/pii-masking.js';
import { NotFoundError, UnauthorizedError, BadRequestError } from '../../middleware/error-handler.js';

/**
 * Add a new vehicle (VEHICLE_OWNER only)
 */
export const addVehicle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'VEHICLE_OWNER' && req.user?.role !== 'ADMIN') {
      throw new UnauthorizedError('Only vehicle owners can add vehicles');
    }

    const { registrationNumber, ...otherData } = req.body;
    if (!registrationNumber) {
      throw new BadRequestError('Registration number is required');
    }

    const existing = await Vehicle.findOne({ registrationNumber });
    if (existing) {
      throw new BadRequestError('Vehicle already exists');
    }

    const vehicle = await Vehicle.create({
      ...otherData,
      registrationNumber,
      ownerId: req.user.id
    });

    await AuditLog.create({
      action: 'VEHICLE_CREATED',
      entityId: vehicle._id,
      entityType: 'Vehicle',
      performedBy: req.user.id,
      performedByRole: req.user.role || 'VEHICLE_OWNER',
      metadata: { registrationNumber }
    });

    res.status(201).json(vehicle);
  } catch (error) {
    next(error);
  }
};

/**
 * List vehicles based on role
 */
export const listVehicles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let query: any = {};
    if (req.user?.role === 'VEHICLE_OWNER') {
      query.ownerId = req.user.id;
    } else if (req.user?.role === 'ADMIN') {
      const { ownerId, isAvailable, isComplianceCleared } = req.query;
      if (ownerId) query.ownerId = ownerId;
      if (isAvailable !== undefined) query.isAvailable = isAvailable === 'true';
      if (isComplianceCleared !== undefined) query.isComplianceCleared = isComplianceCleared === 'true';
    } else {
      throw new UnauthorizedError('Unauthorized to view vehicles');
    }

    let vehicles = await Vehicle.find(query).lean();
    
    // Mask PII depending on role
    if (req.user?.role !== 'ADMIN') {
      vehicles = vehicles.map(v => ({
        ...v,
        registrationNumber: maskPii(v.registrationNumber, 'VEHICLE_REGISTRATION')
      }));
    }

    res.json(vehicles);
  } catch (error) {
    next(error);
  }
};

/**
 * Get vehicle details
 */
export const getVehicleDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).populate('ownerId');
    if (!vehicle) throw new NotFoundError('Vehicle not found');

    if (req.user?.role !== 'ADMIN' && vehicle.ownerId.toString() !== req.user?.id) {
      throw new UnauthorizedError('Unauthorized');
    }

    res.json(vehicle);
  } catch (error) {
    next(error);
  }
};

/**
 * Update vehicle details
 */
export const updateVehicle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) throw new NotFoundError('Vehicle not found');

    if (req.user?.role !== 'ADMIN' && vehicle.ownerId.toString() !== req.user?.id) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { dimensions, isAvailable } = req.body;
    if (dimensions) vehicle.dimensions = dimensions;
    if (isAvailable !== undefined) vehicle.isAvailable = isAvailable;
    
    await vehicle.save();

    await AuditLog.create({
      action: 'VEHICLE_UPDATED',
      entityId: vehicle._id,
      entityType: 'Vehicle',
      performedBy: req.user?.id,
      performedByRole: req.user?.role || 'SYSTEM',
      metadata: { dimensions, isAvailable }
    });

    res.json(vehicle);
  } catch (error) {
    next(error);
  }
};

/**
 * Trigger VAHAN verification
 */
export const verifyVahan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) throw new NotFoundError('Vehicle not found');

    // MOCK ULIP CALL (Assume this calls integration)
    const vahanResponse = {
      rc_status: 'ACTIVE',
      rc_fit_upto: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      rc_gvw: 10000,
      rc_unld_wt: 4000,
      rc_vch_catg: 'HCV',
      rc_maker_desc: 'Tata Motors',
      rc_model: 'LPT 1613',
      rc_fuel_desc: 'DIESEL',
      rc_norms_desc: 'BS-VI',
      rc_insurance_upto: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      lastVerifiedAt: new Date()
    };

    vehicle.vahanData = vahanResponse;
    vehicle.payloadCapacity = vahanResponse.rc_gvw - vahanResponse.rc_unld_wt;
    
    const isFit = vahanResponse.rc_fit_upto > new Date();
    vehicle.isComplianceCleared = vahanResponse.rc_status === 'ACTIVE' && isFit;

    await vehicle.save();

    await AuditLog.create({
      action: 'VAHAN_VERIFICATION',
      entityId: vehicle._id,
      entityType: 'Vehicle',
      performedBy: req.user?.id,
      performedByRole: req.user?.role || 'SYSTEM',
      metadata: { rc_status: vahanResponse.rc_status }
    });

    res.json(vehicle);
  } catch (error) {
    next(error);
  }
};

/**
 * Trigger FASTag verification
 */
export const verifyFastag = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) throw new NotFoundError('Vehicle not found');

    // MOCK ULIP CALL
    const fastagResponse = {
      tagId: `TAG-${vehicle.registrationNumber}`,
      tagStatus: 'A' as const,
      comVehicle: true,
      excCode: '00',
      walletBalance: 1500,
      lastCheckedAt: new Date()
    };

    vehicle.fastagData = fastagResponse;
    await vehicle.save();

    await AuditLog.create({
      action: 'FASTAG_VERIFICATION',
      entityId: vehicle._id,
      entityType: 'Vehicle',
      performedBy: req.user?.id,
      performedByRole: req.user?.role || 'SYSTEM',
      metadata: { status: fastagResponse.tagStatus }
    });

    res.json(vehicle);
  } catch (error) {
    next(error);
  }
};
