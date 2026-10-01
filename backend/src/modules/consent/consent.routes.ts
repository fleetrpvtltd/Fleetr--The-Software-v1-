import { Router } from 'express';
import { grantConsent, withdrawConsent, getConsentStatus } from './consent.controller.js';

const router = Router();

router.post('/grant', grantConsent);
router.post('/withdraw', withdrawConsent);
router.get('/status', getConsentStatus);

export default router;
