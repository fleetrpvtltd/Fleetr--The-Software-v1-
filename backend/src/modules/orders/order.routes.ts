import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { sanitizeInput } from '../../middleware/sanitize-input.js';
import * as OrderController from './order.controller.js';

const router = Router();

router.use(authenticate);

router.post('/', sanitizeInput, OrderController.createOrder);
router.get('/', OrderController.listOrders);
router.get('/:id', OrderController.getOrderDetails);
router.post('/:id/assign-truck', OrderController.assignTruck);
router.post('/:id/assign-godown', OrderController.assignGodown);
router.post('/:id/initiate-payment', OrderController.initiatePayment);
router.post('/:id/confirm', OrderController.confirmOrder);
router.post('/:id/dispatch', OrderController.dispatchOrder);
router.post('/:id/deliver', OrderController.deliverOrder);
router.post('/:id/cancel', OrderController.cancelOrder);
router.get('/:id/lorry-receipt', OrderController.downloadLorryReceipt);
router.post('/ai-suggest', OrderController.aiSuggest);

export default router;
