import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { sanitizeInput } from '../../middleware/sanitize-input.js';
import * as GodownController from './godown.controller.js';

const router = Router();

router.use(authenticate);

router.post('/', sanitizeInput, GodownController.addGodown);
router.get('/', GodownController.listGodowns);
router.get('/:id', GodownController.getGodownDetails);
router.patch('/:id', sanitizeInput, GodownController.updateGodown);
router.patch('/:id/capacity', sanitizeInput, GodownController.updateCapacity);

export default router;
