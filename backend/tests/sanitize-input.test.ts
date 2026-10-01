import { describe, it, expect } from 'vitest';

describe('Input Sanitization Regex Patterns', () => {
  const PATTERNS = {
    VEHICLE_NUMBER: /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/,
    CHASSIS_NUMBER: /^[A-HJ-NPR-Z0-9]{17}$/,
    ENGINE_NUMBER: /^[A-Z0-9]{6,17}$/,
    PINCODE: /^[1-9][0-9]{5}$/,
    GSTIN: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
  };

  it('Valid vehicle numbers pass', () => {
    expect(PATTERNS.VEHICLE_NUMBER.test('MH12AB1234')).toBe(true);
    expect(PATTERNS.VEHICLE_NUMBER.test('DL1CAB1234')).toBe(true);
  });

  it('Invalid vehicle numbers fail', () => {
    expect(PATTERNS.VEHICLE_NUMBER.test('MH 12 AB 1234')).toBe(false);
    expect(PATTERNS.VEHICLE_NUMBER.test('')).toBe(false);
    expect(PATTERNS.VEHICLE_NUMBER.test('toolongvehiclenumber123')).toBe(false);
  });

  it('Valid chassis numbers pass', () => {
    expect(PATTERNS.CHASSIS_NUMBER.test('MA1FB2HS1J3456789')).toBe(true);
  });

  it('Invalid chassis numbers fail', () => {
    expect(PATTERNS.CHASSIS_NUMBER.test('  ')).toBe(false);
    expect(PATTERNS.CHASSIS_NUMBER.test('')).toBe(false);
  });

  it('Valid engine numbers pass', () => {
    expect(PATTERNS.ENGINE_NUMBER.test('K12MN1234567')).toBe(true);
  });

  it('Valid pincodes pass', () => {
    expect(PATTERNS.PINCODE.test('110001')).toBe(true);
    expect(PATTERNS.PINCODE.test('700001')).toBe(true);
  });

  it('Invalid pincodes fail', () => {
    expect(PATTERNS.PINCODE.test('000001')).toBe(false);
    expect(PATTERNS.PINCODE.test('11000')).toBe(false);
  });

  it('Valid GSTIN passes regex', () => {
    expect(PATTERNS.GSTIN.test('27AAPFU0939F1ZV')).toBe(true);
  });

  it('Valid PAN passes regex', () => {
    expect(PATTERNS.PAN.test('ABCPK1234A')).toBe(true);
  });
});
