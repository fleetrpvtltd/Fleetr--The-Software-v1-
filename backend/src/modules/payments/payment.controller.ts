import { Request, Response } from 'express';
import { createRazorpayOrder, verifyWebhookSignature, processWebhookPayment, razorpay } from './razorpay.js';
import { AppError } from '../../middleware/error-handler.js';

export const createOrder = async (req: Request, res: Response) => {
  const { amount, receipt, notes } = req.body;
  if (!amount || !receipt) {
    throw new AppError('Amount and receipt are required', 400);
  }

  const order = await createRazorpayOrder(amount, 'INR', receipt, notes);
  res.status(201).json({ status: 'success', data: order });
};

export const getOrder = async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const order = await razorpay.orders.fetch(orderId);
  res.status(200).json({ status: 'success', data: order });
};

export const handleWebhook = async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  
  if (!signature) {
    throw new AppError('Signature missing', 400);
  }

  const isValid = verifyWebhookSignature(JSON.stringify(req.body), signature);
  if (!isValid) {
    throw new AppError('Invalid signature', 400);
  }

  await processWebhookPayment(req.body);
  res.status(200).json({ status: 'success' });
};
