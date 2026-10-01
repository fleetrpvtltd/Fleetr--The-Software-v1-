import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { syncUser, getMe } from './auth.controller.js';

const router = Router();

// POST /api/auth/sync
// Purpose: Called after Firebase login to sync user to MongoDB
router.post('/sync', authenticate, syncUser);

// GET /api/auth/me
// Purpose: Get current authenticated user's profile
router.get('/me', authenticate, getMe);

export default router;
