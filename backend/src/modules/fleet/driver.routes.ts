import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireConsent } from '../../middleware/compliance/index.js';
import { sanitizeInput } from '../../middleware/sanitize-input.js';
import * as DriverController from './driver.controller.js';

const router = Router();

router.use(authenticate);

router.post('/', sanitizeInput, DriverController.addDriver);
router.get('/', DriverController.listDrivers);
router.get('/:id', DriverController.getDriverDetails);
router.patch('/:id', sanitizeInput, DriverController.updateDriver);
router.post('/:id/verify', requireConsent('SARATHI_LOOKUP'), DriverController.verifySarathi);

export default router;
