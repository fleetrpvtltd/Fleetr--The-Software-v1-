import { Router } from 'express';
import { authenticate, checkRole } from '../../middleware/auth.js';
import * as AdminController from './admin.controller.js';

const router = Router();

router.use(authenticate);
router.use(checkRole('ADMIN'));

router.get('/users', AdminController.listUsers);
router.get('/users/:id', AdminController.getUserDetails);
router.patch('/users/:id', AdminController.updateUserStatus);
router.get('/audit-logs', AdminController.getAuditLogs);
router.get('/breach-logs', AdminController.getBreachLogs);
router.get('/dashboard-stats', AdminController.getDashboardStats);
router.get('/pipeline', AdminController.getPipeline);

export default router;
