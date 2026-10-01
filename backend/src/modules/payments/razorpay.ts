import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../../config/env.js';

export const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: env.RAZORPAY_KEY_SECRET || 'rzp_secret_placeholder'
});

export const createRazorpayOrder = async (amount: number, currency: string = 'INR', receipt: string, notes?: any) => {
  const options = {
    amount: amount * 100, // Amount in paisa
    currency,
    receipt,
    notes
  };
  return razorpay.orders.create(options);
};

export const capturePayment = async (paymentId: string, amount: number) => {
  return razorpay.payments.capture(paymentId, amount * 100, 'INR');
};

export const verifyWebhookSignature = (body: string, signature: string, secret?: string): boolean => {
  const secretKey = secret || env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret';
  const expectedSignature = crypto.createHmac('sha256', secretKey)
                                  .update(body)
                                  .digest('hex');
  if (!signature || signature.length !== expectedSignature.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
};

export const processWebhookPayment = async (payload: any) => {
  // Logic to process verified webhook payload (e.g., mark invoice as paid)
  console.log('Webhook processed', payload);
};
