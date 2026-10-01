import { Router } from 'express';
import authRoutes from './auth/auth.routes.js';
import paymentRoutes from './payments/payment.routes.js';
import fleetRoutes from './fleet/fleet.routes.js';
import orderRoutes from './orders/order.routes.js';
import adminRoutes from './admin/admin.routes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/payments', paymentRoutes);
apiRouter.use('/fleet', fleetRoutes);
apiRouter.use('/orders', orderRoutes);
apiRouter.use('/admin', adminRoutes);

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default apiRouter;
