import { Router } from 'express';
import vehicleRoutes from './vehicle.routes.js';
import driverRoutes from './driver.routes.js';
import godownRoutes from './godown.routes.js';

const router = Router();

router.use('/vehicles', vehicleRoutes);
router.use('/drivers', driverRoutes);
router.use('/godowns', godownRoutes);

export default router;
