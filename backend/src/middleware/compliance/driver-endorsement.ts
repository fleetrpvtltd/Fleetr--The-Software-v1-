import { Request, Response, NextFunction } from 'express';
import { Driver } from '../../models/Driver.js';
import { AppError } from '../error-handler.js';

/**
 * Verify driver holds a valid, active DL with TRANS endorsement
 */
export async function checkDriverEndorsement(driverId: string): Promise<boolean> {
  const driver = await Driver.findById(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404);
  }

  if (driver.sarathiData?.dlStatus !== 'Active') {
    return false;
  }

  if (driver.sarathiData?.dlExpiryDate && new Date(driver.sarathiData.dlExpiryDate) < new Date()) {
    return false;
  }

  if (!driver.sarathiData?.dlcovs?.some(c => c.covCategory === 'TRANS')) {
    return false;
  }

  return true;
}

/**
 * Express middleware to enforce proper driver endorsement for assignments
 */
export const driverEndorsementGuard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { driverId } = req.body;
    if (!driverId) {
      return next();
    }

    const isValid = await checkDriverEndorsement(driverId);
    if (!isValid) {
      return next(new AppError('Driver lacks active TRANS endorsement or DL is invalid/expired.', 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};
