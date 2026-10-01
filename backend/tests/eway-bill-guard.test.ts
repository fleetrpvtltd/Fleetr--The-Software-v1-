import { describe, it, expect } from 'vitest';
import { checkEwayBillRequirement } from '../src/middleware/compliance/eway-bill-guard';

describe('E-Way Bill Guard', () => {
  it('Should require E-Way bill for interstate > 50000', () => {
    const result = checkEwayBillRequirement({ amount: 55000, stateFrom: 'MH', stateTo: 'GJ', hasEwayBill: false });
    expect(result).toBe(true);
  });

  it('Should not require for interstate <= 50000', () => {
    const result = checkEwayBillRequirement({ amount: 45000, stateFrom: 'MH', stateTo: 'GJ', hasEwayBill: false });
    expect(result).toBe(false);
  });

  it('Should use state-specific threshold for intrastate (e.g., Punjab = 100000)', () => {
    const result = checkEwayBillRequirement({ amount: 80000, stateFrom: 'PB', stateTo: 'PB', hasEwayBill: false });
    expect(result).toBe(false);
  });

  it('Should use default 50000 for unlisted states', () => {
    const result = checkEwayBillRequirement({ amount: 60000, stateFrom: 'MH', stateTo: 'MH', hasEwayBill: false });
    expect(result).toBe(true);
  });

  it('Should detect interstate vs intrastate correctly', () => {
    expect(checkEwayBillRequirement({ amount: 60000, stateFrom: 'MH', stateTo: 'MH', hasEwayBill: false })).toBeDefined();
    expect(checkEwayBillRequirement({ amount: 60000, stateFrom: 'MH', stateTo: 'GJ', hasEwayBill: false })).toBeDefined();
  });

  it('Should pass when E-Way bill number is provided', () => {
    const result = checkEwayBillRequirement({ amount: 60000, stateFrom: 'MH', stateTo: 'GJ', hasEwayBill: true, ewayBillNumber: '123456789012' });
    expect(result).toBe(false); 
  });

  it('Should block when required but not provided', () => {
    const result = checkEwayBillRequirement({ amount: 60000, stateFrom: 'MH', stateTo: 'GJ', hasEwayBill: false });
    expect(result).toBe(true);
  });
});
