import { Request, Response, NextFunction } from 'express';
import { AppError } from './error-handler.js';

export const PATTERNS = {
  vehicleNumber: /^[a-zA-Z0-9]{5,11}$/,
  chassisNumber: /^[^\s]{5,24}$/,
  engineNumber: /^[^\s]{1,20}$/,
  dlNumber: /^[A-Z0-9-]{10,20}$/, // Basic approximation
  pincode: /^[1-9][0-9]{5}$/,
  gstin: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
};

/**
 * Middleware factory for validating field values against strict regex patterns
 */
export const sanitizeField = (fieldName: string, fieldPath: 'body' | 'query' | 'params', patternKey: keyof typeof PATTERNS) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req[fieldPath]?.[fieldName];
    if (value !== undefined && value !== null) {
      const pattern = PATTERNS[patternKey];
      if (!pattern.test(String(value))) {
        return next(new AppError(`Invalid format for ${fieldName}`, 400));
      }
    }
    next();
  };
};

/**
 * General sanitizeInput middleware to validate common payload fields
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    if (req.body.registrationNumber && !PATTERNS.vehicleNumber.test(String(req.body.registrationNumber))) {
      return next(new AppError('Invalid registrationNumber format', 400));
    }
    if (req.body.vehicleNumber && !PATTERNS.vehicleNumber.test(String(req.body.vehicleNumber))) {
      return next(new AppError('Invalid vehicleNumber format', 400));
    }
    if (req.body.dlNumber && !PATTERNS.dlNumber.test(String(req.body.dlNumber))) {
      return next(new AppError('Invalid dlNumber format', 400));
    }
    if (req.body.pincode && !PATTERNS.pincode.test(String(req.body.pincode))) {
      return next(new AppError('Invalid pincode format', 400));
    }
    if (req.body.gstin && !PATTERNS.gstin.test(String(req.body.gstin))) {
      return next(new AppError('Invalid GSTIN format', 400));
    }
    if (req.body.pan && !PATTERNS.pan.test(String(req.body.pan))) {
      return next(new AppError('Invalid PAN format', 400));
    }
  }
  next();
};
