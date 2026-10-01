import { describe, it, expect } from 'vitest';
import { calculateTDS, validatePAN } from '../src/modules/pricing/tds-engine';

describe('TDS Engine', () => {
  it('Should return applicable=false when amount <= 30000 and annual <= 100000', () => {
    const result = calculateTDS({
      transactionAmount: 20000,
      annualCumulativeAmount: 50000,
      transporterPan: 'ABCDE1234F',
      transporterEntityType: 'INDIVIDUAL',
      carriageCount: 5,
      hasForm15GH: false
    });
    expect(result.applicable).toBe(false);
  });

  it('Should apply 20% TDS when no PAN provided (Section 206AB)', () => {
    const result = calculateTDS({
      transactionAmount: 40000,
      annualCumulativeAmount: 50000,
      transporterPan: null,
      transporterEntityType: 'INDIVIDUAL',
      carriageCount: 5,
      hasForm15GH: false
    });
    expect(result.applicable).toBe(true);
    expect(result.tdsRate).toBe(20);
  });

  it('Should apply 0% TDS when PAN valid + <=10 carriages + Form 15G/15H valid', () => {
    const result = calculateTDS({
      transactionAmount: 40000,
      annualCumulativeAmount: 50000,
      transporterPan: 'ABCDE1234F',
      transporterEntityType: 'INDIVIDUAL',
      carriageCount: 5,
      hasForm15GH: true,
      form15GHValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    });
    expect(result.applicable).toBe(false);
    expect(result.tdsRate).toBe(0);
  });

  it('Should apply 1% TDS for Individual with valid PAN', () => {
    const result = calculateTDS({
      transactionAmount: 40000,
      annualCumulativeAmount: 50000,
      transporterPan: 'ABCDE1234F',
      transporterEntityType: 'INDIVIDUAL',
      carriageCount: 5,
      hasForm15GH: false
    });
    expect(result.applicable).toBe(true);
    expect(result.tdsRate).toBe(1);
  });

  it('Should apply 1% TDS for HUF with valid PAN', () => {
    const result = calculateTDS({
      transactionAmount: 40000,
      annualCumulativeAmount: 50000,
      transporterPan: 'ABCDE1234F',
      transporterEntityType: 'HUF',
      carriageCount: 5,
      hasForm15GH: false
    });
    expect(result.applicable).toBe(true);
    expect(result.tdsRate).toBe(1);
  });

  it('Should apply 2% TDS for Corporate with valid PAN', () => {
    const result = calculateTDS({
      transactionAmount: 40000,
      annualCumulativeAmount: 50000,
      transporterPan: 'ABCDE1234F',
      transporterEntityType: 'CORPORATE',
      carriageCount: 5,
      hasForm15GH: false
    });
    expect(result.applicable).toBe(true);
    expect(result.tdsRate).toBe(2);
  });

  it('Should apply 2% TDS for Partnership with valid PAN', () => {
    const result = calculateTDS({
      transactionAmount: 40000,
      annualCumulativeAmount: 50000,
      transporterPan: 'ABCDE1234F',
      transporterEntityType: 'PARTNERSHIP',
      carriageCount: 5,
      hasForm15GH: false
    });
    expect(result.applicable).toBe(true);
    expect(result.tdsRate).toBe(2);
  });

  it('Should apply 2% TDS for LLP with valid PAN', () => {
    const result = calculateTDS({
      transactionAmount: 40000,
      annualCumulativeAmount: 50000,
      transporterPan: 'ABCDE1234F',
      transporterEntityType: 'LLP',
      carriageCount: 5,
      hasForm15GH: false
    });
    expect(result.applicable).toBe(true);
    expect(result.tdsRate).toBe(2);
  });

  it('Should apply TDS when single transaction > 30000', () => {
    const result = calculateTDS({
      transactionAmount: 31000,
      annualCumulativeAmount: 50000,
      transporterPan: 'ABCDE1234F',
      transporterEntityType: 'INDIVIDUAL',
      carriageCount: 5,
      hasForm15GH: false
    });
    expect(result.applicable).toBe(true);
  });

  it('Should apply TDS when annual cumulative > 100000 even if single < 30000', () => {
    const result = calculateTDS({
      transactionAmount: 20000,
      annualCumulativeAmount: 101000,
      transporterPan: 'ABCDE1234F',
      transporterEntityType: 'INDIVIDUAL',
      carriageCount: 5,
      hasForm15GH: false
    });
    expect(result.applicable).toBe(true);
  });

  it('Should reject invalid PAN format', () => {
    expect(validatePAN('invalid')).toBe(false);
    expect(validatePAN('12345ABCDE')).toBe(false);
  });

  it('Should not grant 0% if Form 15G/15H is expired', () => {
    const result = calculateTDS({
      transactionAmount: 40000,
      annualCumulativeAmount: 50000,
      transporterPan: 'ABCDE1234F',
      transporterEntityType: 'INDIVIDUAL',
      carriageCount: 5,
      hasForm15GH: true,
      form15GHValidUntil: new Date(Date.now() - 1000)
    });
    expect(result.tdsRate).toBe(1);
  });

  it('Should not grant 0% if carriageCount > 10', () => {
    const result = calculateTDS({
      transactionAmount: 40000,
      annualCumulativeAmount: 50000,
      transporterPan: 'ABCDE1234F',
      transporterEntityType: 'INDIVIDUAL',
      carriageCount: 15,
      hasForm15GH: true,
      form15GHValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    });
    expect(result.tdsRate).toBe(1);
  });

  it('Should correctly calculate tdsAmount = transactionAmount * rate / 100', () => {
    const result = calculateTDS({
      transactionAmount: 40000,
      annualCumulativeAmount: 50000,
      transporterPan: 'ABCDE1234F',
      transporterEntityType: 'CORPORATE',
      carriageCount: 5,
      hasForm15GH: false
    });
    expect(result.tdsRate).toBe(2);
    expect(result.tdsAmount).toBe(800);
  });
});
