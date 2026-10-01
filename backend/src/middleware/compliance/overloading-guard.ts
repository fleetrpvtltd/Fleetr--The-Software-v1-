import { Request, Response, NextFunction } from 'express';
import { Vehicle } from '../../models/Vehicle.js';
import { AppError } from '../error-handler.js';

/**
 * Check if the given cargo weight exceeds the payload capacity of a vehicle
 */
export async function checkOverloading(vehicleId: string, cargoWeightKg: number) {
  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) {
    throw new AppError('Vehicle not found', 404);
  }

  const gvw = vehicle.vahanData?.rc_gvw || 0;
  const unldWt = vehicle.vahanData?.rc_unld_wt || 0;
  const payloadCapacity = gvw - unldWt;

  if (payloadCapacity > 0 && cargoWeightKg > payloadCapacity) {
    const excessKg = cargoWeightKg - payloadCapacity;
    const fine = 20000 + 2000 * Math.ceil(excessKg / 1000);
    return { isOverloaded: true, excessKg, fine, payloadCapacity };
  }

  return { isOverloaded: false, excessKg: 0, fine: 0, payloadCapacity };
}

/**
 * Express middleware to prevent overloading before LR generation
 */
export const overloadingGuard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vehicleId, cargoWeightKg } = req.body;
    if (!vehicleId || cargoWeightKg === undefined) {
      return next();
    }

    const { isOverloaded, excessKg, fine, payloadCapacity } = await checkOverloading(vehicleId, cargoWeightKg);

    if (isOverloaded) {
      return next(new AppError(`Overloading detected. Excess: ${excessKg}kg. Potential fine: ₹${fine}. Capacity: ${payloadCapacity}kg.`, 400));
    }

    next();
  } catch (error) {
    next(error);
  }
};
