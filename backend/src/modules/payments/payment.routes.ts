import { Router } from 'express';
import { asyncHandler } from '../../middleware/error-handler.js';
import { createOrder, getOrder, handleWebhook } from './payment.controller.js';

const router = Router();

router.post('/create-order', asyncHandler(createOrder));
router.post('/webhook', asyncHandler(handleWebhook));
router.get('/:orderId', asyncHandler(getOrder));

export default router;
