import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyWebhookSignature } from '../src/modules/payments/razorpay'; 

describe('Razorpay HMAC Verification', () => {
  const secret = 'my_test_secret';
  const body = JSON.stringify({ event: 'payment.captured' });
  const generateSignature = (payload: string, secret: string) => crypto.createHmac('sha256', secret).update(payload).digest('hex');

  it('Should return true for valid signature', () => {
    const validSignature = generateSignature(body, secret);
    expect(verifyWebhookSignature(body, validSignature, secret)).toBe(true);
  });

  it('Should return false for tampered body', () => {
    const validSignature = generateSignature(body, secret);
    const tamperedBody = JSON.stringify({ event: 'payment.failed' });
    expect(verifyWebhookSignature(tamperedBody, validSignature, secret)).toBe(false);
  });

  it('Should return false for wrong secret', () => {
    const wrongSignature = generateSignature(body, 'wrong_secret');
    expect(verifyWebhookSignature(body, wrongSignature, secret)).toBe(false);
  });

  it('Should return false for empty signature', () => {
    expect(verifyWebhookSignature(body, '', secret)).toBe(false);
  });

  it('Should be timing-safe (no timing leaks)', () => {
    const validSignature = generateSignature(body, secret);
    expect(verifyWebhookSignature(body, validSignature, secret)).toBe(true);
  });
});
