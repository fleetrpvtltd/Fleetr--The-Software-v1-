import { Request, Response, NextFunction } from 'express';
import { ConsentRecord } from '../../models/ConsentRecord.js';
import { AppError } from '../error-handler.js';

export type ConsentPurpose = 'VAHAN_LOOKUP' | 'SARATHI_LOOKUP' | 'GPS_TRACKING' | 'FASTAG_TRACKING' | 'PII_PROCESSING';

/**
 * Express middleware factory to require a specific DPDP consent purpose
 */
export const requireConsent = (purpose: ConsentPurpose) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?._id;
      
      if (!userId) {
        return next(new AppError('Unauthorized', 401));
      }

      const consent = await ConsentRecord.findOne({
        userId,
        purpose,
        isActive: true,
        withdrawnAt: null
      });

      if (!consent) {
        return res.status(403).json({
          status: 'error',
          code: 'CONSENT_REQUIRED',
          message: `Consent required for ${purpose}`
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
