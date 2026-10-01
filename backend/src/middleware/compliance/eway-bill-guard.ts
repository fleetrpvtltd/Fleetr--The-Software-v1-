import { Request, Response, NextFunction } from 'express';
import { AppError } from '../error-handler.js';

export interface EwayBillInput {
  consignmentValue?: number;
  originState?: string;
  destinationState?: string;
  ewayBillNo?: string;
  amount?: number;
  stateFrom?: string;
  stateTo?: string;
  hasEwayBill?: boolean;
  ewayBillNumber?: string;
}

/**
 * Check whether an E-Way Bill is legally required for this consignment
 */
export function checkEwayBillRequirement(input: EwayBillInput): boolean {
  const ewayBill = input.ewayBillNo || input.ewayBillNumber || (input.hasEwayBill ? 'PROVIDED' : undefined);
  if (ewayBill) {
    return false; // Already provided
  }

  const val = input.consignmentValue ?? input.amount ?? 0;
  const from = (input.originState || input.stateFrom || '').toLowerCase();
  const to = (input.destinationState || input.stateTo || '').toLowerCase();

  const isInterstate = from !== to;
  
  if (isInterstate) {
    return val > 50000;
  }

  // Intrastate limits
  const highLimitStates = ['pb', 'punjab', 'tn', 'tamil nadu', 'kerala', 'karnataka'];
  
  if (highLimitStates.includes(from)) {
    return val > 100000;
  }
  
  return val > 50000;
}

/**
 * Express middleware to guard routes against missing E-Way bills
 */
export const ewayBillGuard = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { consignmentValue, originState, destinationState, ewayBillNo } = req.body;
    
    if (consignmentValue && originState && destinationState) {
      const isRequired = checkEwayBillRequirement({
        consignmentValue,
        originState,
        destinationState,
        ewayBillNo
      });

      if (isRequired) {
        throw new AppError('E-Way Bill is legally required for this consignment before proceeding.', 400);
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};
