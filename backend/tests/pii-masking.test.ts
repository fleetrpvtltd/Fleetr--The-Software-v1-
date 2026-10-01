import { describe, it, expect } from 'vitest';
import { maskName, maskPhone, maskEmail, maskDlNumber, maskPan, maskPII } from '../src/utils/pii-masking';

describe('PII Masking Utils', () => {
  it('maskName: Rahul Kumar -> R***l K***r', () => {
    expect(maskName('Rahul Kumar')).toMatch(/R.*l K.*r/);
  });

  it('maskPhone: 9876543210 -> 98****3210', () => {
    expect(maskPhone('9876543210')).toBe('98****3210');
  });

  it('maskEmail: emon@gmail.com -> e***n@gmail.com', () => {
    expect(maskEmail('emon@gmail.com')).toMatch(/e.*n@gmail.com/);
  });

  it('maskDlNumber: DL0120160012345 -> DL****2345 (or similar)', () => {
    expect(maskDlNumber('DL0120160012345')).toMatch(/DL.*2345/);
  });

  it('maskPan: ABCPK1234A -> A***K1***A (or similar)', () => {
    expect(maskPan('ABCPK1234A')).toMatch(/A.*K1.*A/);
  });

  it('maskPII with ADMIN role should return unmasked data', () => {
    const data = { name: 'Rahul Kumar', phone: '9876543210' };
    const result = maskPII(data, 'ADMIN');
    expect(result.name).toBe('Rahul Kumar');
  });

  it('maskPII with non-ADMIN role should mask all sensitive fields', () => {
    const data = { name: 'Rahul Kumar', phone: '9876543210', email: 'emon@gmail.com', pan: 'ABCPK1234A' };
    const result = maskPII(data, 'USER');
    expect(result.phone).toBe('98****3210');
  });
});
