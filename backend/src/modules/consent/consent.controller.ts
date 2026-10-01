import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ConsentRecord } from '../../models/ConsentRecord.js';
import { AppError } from '../../middleware/error-handler.js';

export const grantConsent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?._id;
    const { purpose, consentText } = req.body;

    if (!userId) return next(new AppError('Unauthorized', 401));
    if (!purpose || !consentText) return next(new AppError('Purpose and consentText are required', 400));

    const consentHash = crypto.createHash('sha256').update(`${userId}:${purpose}:${consentText}:${Date.now()}`).digest('hex');

    const consent = await ConsentRecord.create({
      userId,
      purpose,
      consentHash,
      consentText,
      grantedAt: new Date(),
      isActive: true,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({ status: 'success', data: consent });
  } catch (error) {
    next(error);
  }
};

export const withdrawConsent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?._id;
    const { purpose } = req.body;

    if (!userId) return next(new AppError('Unauthorized', 401));
    if (!purpose) return next(new AppError('Purpose is required', 400));

    const consent = await ConsentRecord.findOneAndUpdate(
      { userId, purpose, isActive: true },
      { withdrawnAt: new Date(), isActive: false },
      { new: true }
    );

    if (!consent) {
      return next(new AppError('Active consent not found', 404));
    }

    res.status(200).json({ status: 'success', data: consent });
  } catch (error) {
    next(error);
  }
};

export const getConsentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?._id;
    if (!userId) return next(new AppError('Unauthorized', 401));

    const consents = await ConsentRecord.find({ userId });
    res.status(200).json({ status: 'success', data: consents });
  } catch (error) {
    next(error);
  }
};
