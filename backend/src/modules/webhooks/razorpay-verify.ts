import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { BreachLog } from '../../models/BreachLog.js';

/**
 * Validates Razorpay Webhook HMAC signatures
 */
export const razorpayWebhookAuth = (secret: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers['x-razorpay-signature'] as string;
    if (!signature) {
      return res.status(401).json({ error: 'Missing signature' });
    }

    // Usually webhooks need the raw body. 
    // This assumes body is already a string or we use JSON.stringify as a fallback.
    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyStr)
      .digest('hex');

    try {
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        // Log unauthorized access to BreachLog
        await BreachLog.create({
          userId: null,
          accessedResource: 'Razorpay Webhook',
          accessType: 'UNAUTHORIZED_MODIFICATION',
          flagReason: 'Invalid HMAC signature',
          sourceIp: req.ip,
          userAgent: req.headers['user-agent'],
          severity: 'HIGH'
        });

        return res.status(401).json({ error: 'Invalid signature' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};
