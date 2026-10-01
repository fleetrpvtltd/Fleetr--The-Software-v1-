import { Request, Response, NextFunction } from 'express';
import { Driver } from '../../models/Driver.js';
import { AuditLog } from '../../models/AuditLog.js';
import { maskPii } from '../../utils/pii-masking.js';
import { NotFoundError, UnauthorizedError, BadRequestError } from '../../middleware/error-handler.js';

export const addDriver = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'VEHICLE_OWNER' && req.user?.role !== 'ADMIN') {
      throw new UnauthorizedError('Only vehicle owners can add drivers');
    }

    const { dlNumber, ...otherData } = req.body;
    if (!dlNumber) {
      throw new BadRequestError('DL number is required');
    }

    const driver = await Driver.create({
      ...otherData,
      dlNumber,
      ownerId: req.user.id
    });

    await AuditLog.create({
      action: 'DRIVER_CREATED',
      entityId: driver._id,
      entityType: 'Driver',
      performedBy: req.user.id,
      performedByRole: req.user.role || 'VEHICLE_OWNER',
      metadata: { dlNumber }
    });

    res.status(201).json(driver);
  } catch (error) {
    next(error);
  }
};

export const listDrivers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let query: any = {};
    if (req.user?.role === 'VEHICLE_OWNER') {
      query.ownerId = req.user.id;
    } else if (req.user?.role === 'ADMIN') {
      // Admin gets all
    } else {
      throw new UnauthorizedError('Unauthorized to view drivers');
    }

    let drivers = await Driver.find(query).lean();
    
    if (req.user?.role !== 'ADMIN') {
      drivers = drivers.map(d => ({
        ...d,
        dlNumber: maskPii(d.dlNumber, 'DRIVERS_LICENSE'),
        phone: maskPii(d.phone, 'PHONE')
      }));
    }

    res.json(drivers);
  } catch (error) {
    next(error);
  }
};

export const getDriverDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) throw new NotFoundError('Driver not found');

    if (req.user?.role !== 'ADMIN' && driver.ownerId.toString() !== req.user?.id) {
      throw new UnauthorizedError('Unauthorized');
    }

    res.json(driver);
  } catch (error) {
    next(error);
  }
};

export const updateDriver = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) throw new NotFoundError('Driver not found');

    if (req.user?.role !== 'ADMIN' && driver.ownerId.toString() !== req.user?.id) {
      throw new UnauthorizedError('Unauthorized');
    }

    Object.assign(driver, req.body);
    await driver.save();

    await AuditLog.create({
      action: 'DRIVER_UPDATED',
      entityId: driver._id,
      entityType: 'Driver',
      performedBy: req.user?.id,
      performedByRole: req.user?.role || 'SYSTEM',
      metadata: req.body
    });

    res.json(driver);
  } catch (error) {
    next(error);
  }
};

export const verifySarathi = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) throw new NotFoundError('Driver not found');

    // MOCK ULIP SARATHI CALL
    const sarathiResponse = {
      dlStatus: 'Active' as const,
      dlcovs: [{ covCategory: 'TRANS', covIssueDate: new Date() }],
      dlExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      lastVerifiedAt: new Date()
    };

    driver.sarathiData = sarathiResponse;
    driver.hasTransEndorsement = sarathiResponse.dlcovs.some(c => c.covCategory === 'TRANS');
    driver.isComplianceCleared = sarathiResponse.dlStatus === 'Active' && driver.hasTransEndorsement;

    await driver.save();

    await AuditLog.create({
      action: 'SARATHI_VERIFICATION',
      entityId: driver._id,
      entityType: 'Driver',
      performedBy: req.user?.id,
      performedByRole: req.user?.role || 'SYSTEM',
      metadata: { status: sarathiResponse.dlStatus }
    });

    res.json(driver);
  } catch (error) {
    next(error);
  }
};
