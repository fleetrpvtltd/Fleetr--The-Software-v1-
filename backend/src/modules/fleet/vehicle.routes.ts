import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireConsent } from '../../middleware/compliance/index.js';
import { sanitizeInput } from '../../middleware/sanitize-input.js';
import * as VehicleController from './vehicle.controller.js';

const router = Router();

router.use(authenticate);

router.post('/', sanitizeInput, VehicleController.addVehicle);
router.get('/', VehicleController.listVehicles);
router.get('/:id', VehicleController.getVehicleDetails);
router.patch('/:id', sanitizeInput, VehicleController.updateVehicle);
router.post('/:id/verify', requireConsent('VAHAN_LOOKUP'), VehicleController.verifyVahan);
router.post('/:id/verify-fastag', VehicleController.verifyFastag);

export default router;
