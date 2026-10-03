/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import { dbService } from './dbService';
import { adminAuth } from './firebaseAdmin';
import {
  verifyVahan,
  verifySarathi,
  checkFastag,
  verifyEChallan,
  verifyAaiclas
} from './ulipServices';
import {
  getOptimizedTrucks,
  getOptimizedGodowns,
  getAnomalies,
  getDemandForecast
} from './aiServices';
import { calculateRealTariffAndRoute, findHub, LOGISTICS_HUBS } from './routingEngine';
import { executeRealtimeRoutingAnalysis, enrichVehicleTelemetry } from './geospatialService';
import { User, Vehicle, Driver, Godown, Delivery, Payment, Invoice, Notification, AuditLog, Assignment, SupportTicket, DashboardStats } from '../types';

export const MASTER_ADMIN_EMAILS = [
  'emonpoddar01@gmail.com',
  'nilavra.s2007@gmail.com'
];

export const apiRouter = Router();

// Per-request authentication validator using firebase-admin verifyIdToken()
export async function authenticateRequest(req: Request): Promise<User | null> {
  // If already authenticated on this request lifecycle, return the per-request user
  if ((req as any).user !== undefined) {
    return (req as any).user;
  }

  const authHeader = req.headers['authorization'];
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  if (!token) {
    (req as any).user = null;
    return null;
  }

  // Strictly verify Firebase ID Token using Firebase Admin SDK
  if (token.split('.').length === 3) {
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      (req as any).decodedToken = decodedToken;

      let user = await dbService.getUser(decodedToken.uid);
      if (!user && decodedToken.email) {
        user = await dbService.getUserByEmail(decodedToken.email);
      }

      if (user) {
        (req as any).user = user;
        return user;
      }
    } catch (err: any) {
      console.warn('Firebase ID token verification failed:', err?.message || err);
      (req as any).user = null;
      return null;
    }
  }

  (req as any).user = null;
  return null;
}

// Request user resolver (Strictly per-request; no global variables)
export async function getCurrentUser(req: Request): Promise<User | null> {
  return await authenticateRequest(req);
}

// Global per-request authentication middleware attaching req.user
apiRouter.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authenticateRequest(req);
  } catch (err) {
    console.error('Error during per-request authentication:', err);
  }
  next();
});

// Middleware for RBAC check
export function checkRole(roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({
        error: 'UNAUTHENTICATED',
        message: 'Valid authentication credentials required in Authorization header'
      });
    }

    const isMasterAdmin =
      user.role === 'ADMIN' ||
      MASTER_ADMIN_EMAILS.includes(user.email);

    // Admins possess universal superuser privileges across workspaces
    if (!roles.includes(user.role) && !isMasterAdmin) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: `Unauthorized permission roles. Requires one of: ${roles.join(', ')}`
      });
    }

    if (user.status === 'SUSPENDED' && !isMasterAdmin) {
      return res.status(403).json({
        error: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been suspended by the platform administrator. Access to dispatch, fleet operations, and transactions is restricted.'
      });
    }

    (req as any).user = user;
    next();
  };
}

// Write helper for generating audit logs directly in Firestore
async function logAction(req: Request | null, actionName: string, details: string) {
  try {
    const user = req ? await getCurrentUser(req) : null;
    const clientIp = req
      ? ((req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || '127.0.0.1')
          .split(',')[0]
          .trim()
      : '127.0.0.1';

    const newLog: AuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      userId: user ? user.id : 'usr_system',
      userName: user ? user.name : 'System Gateway',
      userRole: user ? user.role : 'ADMIN',
      action: actionName,
      details: details,
      ipPlaceholder: clientIp,
      timestamp: new Date().toISOString()
    };
    await dbService.createAuditLog(newLog);
  } catch (err) {
    console.warn('logAction notice:', err);
  }
}

// ---------------- AUTH ENDPOINTS ----------------
apiRouter.post('/auth/register', async (req: Request, res: Response) => {
  const { name, email, role, phone, gstin, companyName, address, id } = req.body;
  if (!role || !email || !name) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'Ensure Name, Email and Role are correct' });
  }

  // Prevent unauthorized escalation to ADMIN role
  if (role === 'ADMIN') {
    const caller = await getCurrentUser(req);
    const isCallerMasterAdmin =
      caller?.role === 'ADMIN' || (caller?.email && MASTER_ADMIN_EMAILS.includes(caller.email));
    if (!isCallerMasterAdmin && !MASTER_ADMIN_EMAILS.includes(email.toLowerCase())) {
      return res.status(403).json({
        error: 'ADMIN_REGISTRATION_FORBIDDEN',
        message: 'Administrative master accounts cannot be self-registered.'
      });
    }
  }

  const existing = (id ? await dbService.getUser(id) : null) || (await dbService.getUserByEmail(email));
  if (existing) {
    existing.name = name;
    existing.phone = phone || existing.phone || '+919999900000';
    // Preserve existing role: do NOT allow arbitrary role reassignment via registration sync
    existing.gstin = gstin || existing.gstin;
    existing.organizationName = companyName || existing.organizationName;
    existing.address = address || existing.address;
    await logAction(req, 'SYNC', `Synchronized profile details for ${existing.role}`);
    await dbService.setUser(existing.id, existing);
    return res.json({ success: true, user: existing });
  }

  const newUser: User = {
    id: id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name,
    email,
    phone: phone || '+919999900000',
    role,
    gstin,
    organizationName: companyName || name,
    address,
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  };

  // Populate profiles
  if (role === 'BUSINESS_OWNER') {
    newUser.businessProfile = { companyName: companyName || name, gstin: gstin || '07AAAAA0000A1Z0', billingAddress: address || 'Default Billing' };
  } else if (role === 'TRUCK_OWNER') {
    newUser.truckOwnerProfile = { companyName: companyName || name, gstin: gstin || '06CCCCC0000C3Z0', fleetCount: 0 };
  } else if (role === 'GODOWN_OWNER') {
    newUser.godownOwnerProfile = { companyName: companyName || name, gstin: gstin || '24EEEEE0000E5Z0', godownCount: 0 };
  }

  await dbService.setUser(newUser.id, newUser);
  await logAction(req, 'SIGNUP', `Signed up as a new ${role}`);

  res.status(201).json({ success: true, user: newUser });
});

apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const adminPass = process.env.ADMIN_PASSWORD;

  // Dedicated Seed Admin login with configured ADMIN_PASSWORD env var
  if (adminPass && email && MASTER_ADMIN_EMAILS.includes(email.toLowerCase()) && password === adminPass) {
    const adminUser = (await dbService.getUserByEmail(email)) || (await dbService.getUserByRole('ADMIN'));
    if (adminUser) {
      await logAction(req, 'LOGIN', 'Administrative master account logged in via configured admin password');
      return res.json({ success: true, user: adminUser });
    }
  }

  // All standard logins must authenticate via Firebase Auth client SDK (which returns a verified JWT)
  res.status(401).json({
    error: 'AUTH_REQUIRED',
    message: 'User authentication must be performed via Firebase Auth.'
  });
});

apiRouter.get('/auth/me', async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  res.json({ user: user || null });
});

apiRouter.post('/auth/logout', async (req: Request, res: Response) => {
  await logAction(req, 'LOGOUT', 'User logged out safe');
  res.json({ success: true });
});

// Role switching disabled: Master Admin cannot access or log into other portals
apiRouter.post('/auth/switch-role', async (req: Request, res: Response) => {
  return res.status(403).json({
    error: 'ROLE_SWITCH_DISABLED',
    message: 'Master Admin accounts are strictly restricted to the Master Administration Command Center and cannot log into or access merchant, fleet, or warehouse portals.'
  });
});

// ---------------- USER MANAGEMENT ----------------
apiRouter.get('/users', checkRole(['ADMIN']), async (req: Request, res: Response) => {
  const users = await dbService.getUsers();
  res.json({ users });
});

apiRouter.get('/users/:id', checkRole(['ADMIN']), async (req: Request, res: Response) => {
  const user = await dbService.getUser(req.params.id);
  if (!user) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json({ user });
});

apiRouter.patch('/users/:id/status', checkRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let user = await dbService.getUser(id);
    if (!user) {
      user = await dbService.getUserByEmail(id);
    }
    if (!user) return res.status(404).json({ error: 'NOT_FOUND', message: 'User profile not found.' });

    if (
      user.role === 'ADMIN' ||
      user.id === 'usr_admin' ||
      MASTER_ADMIN_EMAILS.includes(user.email)
    ) {
      return res.status(400).json({ error: 'ADMIN_CANNOT_BE_SUSPENDED', message: 'Master Admin account cannot be suspended.' });
    }

    const status = req.body.status;
    if (!['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'].includes(status)) {
      return res.status(400).json({ error: 'INVALID_STATUS', message: 'Invalid status value.' });
    }

    await dbService.updateUser(user.id, { status });
    if (id !== user.id) {
      await dbService.updateUser(id, { status }).catch(() => {});
    }
    user.status = status;
    await logAction(req, 'USER_STATUS', `Updated user ${user.name} (${user.email}) status flag to ${status}`);
    res.json({ success: true, user });
  } catch (err: any) {
    console.error('Error updating user status:', err);
    res.status(500).json({ error: 'STATUS_UPDATE_FAILED', message: err.message });
  }
});

apiRouter.delete('/users/:id', checkRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let user = await dbService.getUser(id);
    if (!user) {
      user = await dbService.getUserByEmail(id);
    }
    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found in system.' });
    }

    if (
      user.role === 'ADMIN' ||
      user.id === 'usr_admin' ||
      MASTER_ADMIN_EMAILS.includes(user.email)
    ) {
      return res.status(400).json({ error: 'CANNOT_DELETE_ADMIN', message: 'Master Admin account is protected and cannot be deleted.' });
    }

    const result = await dbService.deleteUserCascade(user.id || id);
    await logAction(
      req,
      'USER_DELETED',
      `Permanently deleted user ${user.name} (${user.email}, Role: ${user.role}) and associated records: ${JSON.stringify(result.deletedCounts)}`
    );

    res.json({
      success: true,
      message: `Account for ${user.name} and all associated records successfully deleted from database.`,
      deletedCounts: result.deletedCounts
    });
  } catch (err: any) {
    console.error('Error deleting user cascade:', err);
    res.status(500).json({ error: 'DELETE_USER_FAILED', message: err.message || 'Failed to delete user and records.' });
  }
});

// ---------------- FLEET & VEHICLES ----------------
apiRouter.get('/fleet/vehicles', checkRole(['TRUCK_OWNER', 'ADMIN', 'BUSINESS_OWNER', 'GODOWN_OWNER']), async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const limitCount = req.query.limit ? Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10))) : 20;
  const startAfterCursor = (req.query.startAfter as string) || (req.query.cursor as string) || undefined;

  let ownerId: string | undefined = undefined;
  if (user.role === 'ADMIN') {
    if (req.query.ownerId) {
      ownerId = req.query.ownerId as string;
    }
  } else if (user.role === 'TRUCK_OWNER') {
    ownerId = user.id;
  }

  const result = await dbService.getVehicles({
    ownerId,
    limitCount,
    startAfterCursor
  });

  res.json({
    vehicles: result.vehicles,
    nextCursor: result.nextCursor,
    hasMore: result.hasMore,
    total: result.vehicles.length
  });
});

apiRouter.post('/fleet/vehicles', checkRole(['TRUCK_OWNER', 'ADMIN']), async (req: Request, res: Response) => {
  const { vehicleNumber, chassisNumber, engineNumber, vehicleType, capacityKg, volumeCubicCm } = req.body;
  const user = (req as any).user as User;
  const ownerId = user.id;

  const newVeh: Vehicle = {
    id: `veh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ownerId,
    vehicleNumber,
    chassisNumber,
    engineNumber,
    vehicleType: vehicleType || 'Commercial Lorry FTL',
    capacityKg: Number(capacityKg) || 10000,
    volumeCubicCm: Number(volumeCubicCm) || 20000000,
    rcStatus: 'ACTIVE',
    fitnessValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 3).toISOString().split('T')[0],
    insuranceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    taxValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 3).toISOString().split('T')[0],
    vahanVerified: false,
    fastagStatus: 'ACTIVE',
    fastagBalance: 1500,
    pendingChallansCount: 0
  };

  await dbService.createVehicle(newVeh);
  await logAction(req, 'VEHICLE_ADD', `Registered new vehicle asset: ${vehicleNumber}`);
  res.status(201).json({ success: true, vehicle: newVeh });
});

apiRouter.post('/fleet/vehicles/:id/verify-vahan', checkRole(['TRUCK_OWNER', 'ADMIN']), async (req: Request, res: Response) => {
  const veh = await dbService.getVehicle(req.params.id);
  if (!veh) return res.status(404).json({ error: 'NOT_FOUND' });

  const result = verifyVahan(veh.vehicleNumber);
  if (result.success && result.data) {
    const updates = {
      vahanVerified: true,
      rcStatus: result.data.rc_status as any,
      fitnessValidUntil: result.data.rc_fit_upto,
      insuranceValidUntil: result.data.rc_insurance_upto
    };
    await dbService.updateVehicle(veh.id, updates);
    await logAction(req, 'VAHAN_VERIFY', `Completed ULIP VAHAN audit compliance checks on vehicle ${veh.vehicleNumber}`);
    res.json({ success: true, details: result.data });
  } else {
    await dbService.updateVehicle(veh.id, { rcStatus: 'INACTIVE' });
    res.status(400).json({ success: false, message: result.message });
  }
});

apiRouter.post('/fleet/vehicles/:id/check-fastag', checkRole(['TRUCK_OWNER', 'ADMIN', 'GODOWN_OWNER']), async (req: Request, res: Response) => {
  const veh = await dbService.getVehicle(req.params.id);
  if (!veh) return res.status(404).json({ error: 'NOT_FOUND' });

  const result = checkFastag(veh.vehicleNumber);
  if (result.success && result.data) {
    const updates: Partial<Vehicle> = {
      fastagBalance: result.data.balance,
      fastagStatus: result.data.TAGSTATUS as any
    };
    if (result.data.recentWaypoints && result.data.recentWaypoints.length > 0) {
      updates.lastTollPlaza = result.data.recentWaypoints[0].tollPlazaName;
      updates.lastTollTime = result.data.recentWaypoints[0].readerReadTime;
    }
    await dbService.updateVehicle(veh.id, updates);
    res.json({ success: true, details: result.data });
  } else {
    res.status(400).json({ success: false, error: result.message });
  }
});

apiRouter.post('/fleet/vehicles/:id/check-echallan', checkRole(['TRUCK_OWNER', 'ADMIN']), async (req: Request, res: Response) => {
  const veh = await dbService.getVehicle(req.params.id);
  if (!veh) return res.status(404).json({ error: 'NOT_FOUND' });

  const result = verifyEChallan(veh.vehicleNumber);
  if (result.success) {
    const pendingChallansCount = result.pendingChallans ? result.pendingChallans.length : 0;
    await dbService.updateVehicle(veh.id, { pendingChallansCount });
    res.json({ success: true, pendingChallans: result.pendingChallans });
  } else {
    res.status(400).json({ success: false, error: result.message });
  }
});

// ---------------- DRIVERS ----------------
apiRouter.get('/drivers', checkRole(['TRUCK_OWNER', 'ADMIN']), async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  if (user.role === 'ADMIN') {
    const drivers = await dbService.getDrivers();
    return res.json({ drivers });
  }
  const drivers = await dbService.getDrivers(user.id);
  res.json({ drivers });
});

apiRouter.post('/drivers', checkRole(['TRUCK_OWNER', 'ADMIN']), async (req: Request, res: Response) => {
  const { name, phone, dlNumber, dob } = req.body;
  const user = (req as any).user as User;
  const ownerId = user.id;

  const newDriver: Driver = {
    id: `drv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ownerId,
    name,
    phone,
    dlNumber,
    dob,
    dlStatus: 'Active',
    hasTransportEndorsement: true,
    sarathiVerified: false,
    consentTimestamp: new Date().toISOString()
  };

  await dbService.createDriver(newDriver);
  await logAction(req, 'DRIVER_ADD', `Registered driver: ${name}`);
  res.status(201).json({ success: true, driver: newDriver });
});

apiRouter.post('/drivers/:id/verify-sarathi', checkRole(['TRUCK_OWNER', 'ADMIN']), async (req: Request, res: Response) => {
  const drv = await dbService.getDriver(req.params.id);
  if (!drv) return res.status(404).json({ error: 'NOT_FOUND' });

  const result = verifySarathi(drv.dlNumber, drv.dob);
  if (result.success && result.data) {
    const updates = {
      sarathiVerified: true,
      dlStatus: result.data.dlStatus as any,
      hasTransportEndorsement: result.data.hasTransportEndorsement
    };
    await dbService.updateDriver(drv.id, updates);
    await logAction(req, 'SARATHI_VERIFY', `Completed ULIP SARATHI DL credential authentication for ${drv.name}`);
    res.json({ success: true, details: result.data });
  } else {
    await dbService.updateDriver(drv.id, { dlStatus: 'Inactive' });
    res.status(400).json({ success: false, error: result.message });
  }
});

apiRouter.patch('/drivers/:id', checkRole(['TRUCK_OWNER', 'ADMIN']), async (req: Request, res: Response) => {
  const drv = await dbService.getDriver(req.params.id);
  if (!drv) return res.status(404).json({ error: 'NOT_FOUND' });

  const { whatsappOptIn, whatsappOptInAt, whatsappOptInSource, conversationState, currentTripId, lastInboundAt } = req.body;
  const updates: Partial<Driver> = {};
  if (whatsappOptIn !== undefined) updates.whatsappOptIn = whatsappOptIn;
  if (whatsappOptInAt !== undefined) updates.whatsappOptInAt = whatsappOptInAt;
  if (whatsappOptInSource !== undefined) updates.whatsappOptInSource = whatsappOptInSource;
  if (conversationState !== undefined) updates.conversationState = conversationState;
  if (currentTripId !== undefined) updates.currentTripId = currentTripId;
  if (lastInboundAt !== undefined) updates.lastInboundAt = lastInboundAt;

  await dbService.updateDriver(drv.id, updates);
  const updatedDriver = await dbService.getDriver(drv.id);
  await logAction(req, 'DRIVER_UPDATE', `Updated Driver ${drv.name} WhatsApp/FSM details`);
  res.json({ success: true, driver: updatedDriver });
});

// ---------------- GODOWNS ----------------
apiRouter.get('/godowns', checkRole(['GODOWN_OWNER', 'ADMIN', 'BUSINESS_OWNER', 'TRUCK_OWNER']), async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  if (user.role === 'ADMIN' || user.role === 'BUSINESS_OWNER') {
    const godowns = await dbService.getGodowns();
    return res.json({ godowns });
  }
  const godowns = await dbService.getGodowns(user.id);
  res.json({ godowns });
});

apiRouter.post('/godowns', checkRole(['GODOWN_OWNER', 'ADMIN']), async (req: Request, res: Response) => {
  const { name, location, address, totalCapacityKg, storageTypes, handlingTimeHours, dimensions } = req.body;
  const user = (req as any).user as User;
  const ownerId = user.id;

  const newGdn: Godown = {
    id: `gdn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ownerId,
    name,
    location,
    address,
    dimensions: dimensions || '100x60x20 meters',
    latitude: 23.0 + Math.random(),
    longitude: 72.0 + Math.random(),
    totalCapacityKg: Number(totalCapacityKg) || 100000,
    availableCapacityKg: Number(totalCapacityKg) || 100000,
    storageTypes: storageTypes || ['Dry'],
    handlingTimeHours: Number(handlingTimeHours) || 2
  };

  await dbService.createGodown(newGdn);
  await logAction(req, 'GODOWN_ADD', `Structured new warehoused spatial site: ${name}`);
  res.status(201).json({ success: true, godown: newGdn });
});

apiRouter.patch('/godowns/:id/capacity', checkRole(['GODOWN_OWNER', 'ADMIN']), async (req: Request, res: Response) => {
  const gdn = await dbService.getGodown(req.params.id);
  if (!gdn) return res.status(404).json({ error: 'NOT_FOUND' });

  const { availableCapacityKg } = req.body;
  if (availableCapacityKg !== undefined) {
    const cap = Math.min(gdn.totalCapacityKg, Math.max(0, Number(availableCapacityKg)));
    await dbService.updateGodown(gdn.id, { availableCapacityKg: cap });
    gdn.availableCapacityKg = cap;
    await logAction(req, 'GODOWN_CAPACITY', `Updated godown capacity margin: ${gdn.name}`);
  }
  res.json({ success: true, godown: gdn });
});

apiRouter.post('/godowns/:id/recalculate-capacity', checkRole(['GODOWN_OWNER', 'ADMIN']), async (req: Request, res: Response) => {
  const gdn = await dbService.getGodown(req.params.id);
  if (!gdn) return res.status(404).json({ error: 'NOT_FOUND' });

  const delResult = await dbService.getDeliveries({ godownIds: [gdn.id], limitCount: 100 });
  const activeCargo = delResult.deliveries.filter((d) => d.status === 'AT_GODOWN');
  const occupiedKg = activeCargo.reduce((sum, d) => sum + (d.goodsWeightKg || 0), 0);
  const actualAvailable = Math.max(0, gdn.totalCapacityKg - occupiedKg);

  await dbService.updateGodown(gdn.id, { availableCapacityKg: actualAvailable });
  gdn.availableCapacityKg = actualAvailable;

  await logAction(req, 'GODOWN_RECALC', `Recalculated actual stored payload for ${gdn.name}: ${occupiedKg} kg occupied across ${activeCargo.length} consignments`);
  res.json({ success: true, godown: gdn, occupiedKg, activeCargoCount: activeCargo.length });
});

// ---------------- DELIVERIES ----------------
apiRouter.get('/deliveries', checkRole(['BUSINESS_OWNER', 'TRUCK_OWNER', 'GODOWN_OWNER', 'ADMIN']), async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const limitCount = req.query.limit ? Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10))) : 20;
  const startAfterCursor = (req.query.startAfter as string) || (req.query.cursor as string) || undefined;
  const statusFilter = (req.query.status as string) || undefined;
  const scope = (req.query.scope as string) || undefined;

  const filter: any = {
    limitCount,
    startAfterCursor
  };
  if (statusFilter) {
    filter.status = statusFilter;
  }

  if (user.role === 'ADMIN') {
    if (req.query.customerId) {
      filter.customerId = req.query.customerId as string;
    }
  } else if (user.role === 'BUSINESS_OWNER') {
    filter.customerId = user.id;
  } else if (user.role === 'TRUCK_OWNER') {
    if (scope === 'available') {
      filter.status = 'CONFIRMED';
    } else {
      const myVehs = (await dbService.getVehicles({ ownerId: user.id, limitCount: 100 })).vehicles.map((v) => v.id);
      const myDrivers = (await dbService.getDrivers(user.id)).map((d) => d.id);
      if (myVehs.length === 0 && myDrivers.length === 0) {
        return res.json({ deliveries: [], nextCursor: null, hasMore: false, total: 0 });
      }
      if (myVehs.length > 0) {
        filter.vehicleIds = myVehs;
      }
    }
  } else if (user.role === 'GODOWN_OWNER') {
    const myWarehouses = (await dbService.getGodowns(user.id)).map((g) => g.id);
    if (myWarehouses.length === 0) {
      return res.json({ deliveries: [], nextCursor: null, hasMore: false, total: 0 });
    }
    filter.godownIds = myWarehouses;
  } else {
    return res.json({ deliveries: [], nextCursor: null, hasMore: false, total: 0 });
  }

  const result = await dbService.getDeliveries(filter);

  res.json({
    deliveries: result.deliveries,
    nextCursor: result.nextCursor,
    hasMore: result.hasMore,
    total: result.deliveries.length
  });
});

apiRouter.get('/deliveries/return-trips', checkRole(['TRUCK_OWNER', 'ADMIN']), async (req: Request, res: Response) => {
  const { currentCity, destinationCity } = req.query;
  const currentHub = findHub(currentCity as string || 'Ahmedabad');
  const returnDestHub = findHub(destinationCity as string || 'Mumbai');

  const snap = await dbService.getDeliveries({ limitCount: 50 });
  const candidates = snap.deliveries.filter((d) => {
    if (['DELIVERED', 'CANCELLED', 'FAILED', 'IN_TRANSIT'].includes(d.status)) return false;
    const dPickupHub = findHub(d.pickupLocation);
    return dPickupHub.name === currentHub.name;
  });

  res.json({
    currentHub: currentHub.name,
    targetHub: returnDestHub.name,
    candidates
  });
});

apiRouter.get('/deliveries/:id', async (req: Request, res: Response) => {
  const del = await dbService.getDelivery(req.params.id);
  if (!del) return res.status(404).json({ error: 'NOT_FOUND' });

  const [vehicle, driver, godown, payment, invoice] = await Promise.all([
    del.assignedVehicleId ? dbService.getVehicle(del.assignedVehicleId) : Promise.resolve(null),
    del.assignedDriverId ? dbService.getDriver(del.assignedDriverId) : Promise.resolve(null),
    del.intermediateGodownId ? dbService.getGodown(del.intermediateGodownId) : Promise.resolve(null),
    dbService.getPaymentByDeliveryId(del.id),
    dbService.getInvoiceByDeliveryId(del.id)
  ]);

  res.json({
    delivery: del,
    assignedVehicle: vehicle,
    assignedDriver: driver,
    assignedGodown: godown,
    payment,
    invoice
  });
});

apiRouter.post('/deliveries', checkRole(['BUSINESS_OWNER', 'ADMIN']), async (req: Request, res: Response) => {
  const {
    goodsDescription,
    goodsCategory,
    goodsWeightKg,
    goodsVolumeCubicCm,
    goodsValueInr,
    pickupDate,
    pickupLocation,
    destinationLocation,
    specialInstructions,
    urgencyLevel,
    ewayBillNo,
    consignorGstin,
    consigneeGstin,
    intermediateGodownId
  } = req.body;

  const user = (req as any).user as User;
  const customerId = user.id;

  // Calculate realistic highway route, toll checkpoints, and commercial freight tariff
  const weightNum = Number(goodsWeightKg) || 1000;
  const tariff = calculateRealTariffAndRoute(
    pickupLocation,
    destinationLocation,
    weightNum,
    ewayBillNo
  );

  const newDel: Delivery = {
    id: `del_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    customerId,
    goodsDescription,
    goodsCategory: goodsCategory || 'General Goods',
    goodsWeightKg: weightNum,
    goodsVolumeCubicCm: Number(goodsVolumeCubicCm) || 2000000,
    goodsValueInr: Number(goodsValueInr) || 100000,
    pickupDate,
    pickupLocation,
    destinationLocation,
    specialInstructions,
    urgencyLevel: urgencyLevel || 'STANDARD',
    ewayBillNo: tariff.generatedEwayBill,
    consignorGstin: consignorGstin || '07AAAAA0000A1Z0',
    consigneeGstin: consigneeGstin || '07BBBBB0000B2Z0',
    status: 'REQUESTED',
    createdAt: new Date().toISOString(),
    intermediateGodownId
  };

  const newPayment: Payment = {
    id: `pay_${Date.now()}`,
    deliveryId: newDel.id,
    baseFreight: tariff.baseFreight,
    distanceKm: tariff.distanceKm,
    tollSurcharge: tariff.tollSurcharge,
    gstRate: tariff.gstRate,
    tdsRate: tariff.tdsRate,
    totalAmount: tariff.totalAmount,
    status: 'PENDING',
    gatewayOrderId: `gateway_ord_${Date.now()}`
  };

  await dbService.createDelivery(newDel);
  await dbService.createPayment(newPayment);

  const newNot: Notification = {
    id: `not_${Date.now()}`,
    userId: customerId,
    title: 'Consignment Created',
    message: `Delivery consignment ${newDel.id} registered with route ${tariff.distanceKm} km. E-way bill ${newDel.ewayBillNo} verified.`,
    type: 'SUCCESS',
    read: false,
    createdAt: new Date().toISOString()
  };
  await dbService.createNotification(newNot);

  await dbService.createNotification({
    id: `not_admin_${Date.now()}`,
    userId: 'usr_admin',
    title: 'New Freight Booking',
    message: `Consignment ${newDel.id} queued: ${pickupLocation} to ${destinationLocation} (${tariff.distanceKm} km).`,
    type: 'WARNING',
    read: false,
    createdAt: new Date().toISOString()
  });

  await logAction(req, 'DELIVERY_CREATE', `Created transport order request: ${newDel.id} (${tariff.distanceKm} km, ₹${tariff.totalAmount})`);
  res.status(201).json({ success: true, delivery: newDel, payment: newPayment });
});

apiRouter.patch('/deliveries/:id/status', async (req: Request, res: Response) => {
  const { status } = req.body;
  const del = await dbService.getDelivery(req.params.id);
  if (!del) return res.status(404).json({ error: 'NOT_FOUND' });

  const user = await getCurrentUser(req);
  const oldStatus = del.status;

  const validTransitions: Record<string, string[]> = {
    REQUESTED: ['ADMIN_REVIEWED', 'TRUCK_ASSIGNED', 'CANCELLED'],
    ADMIN_REVIEWED: ['TRUCK_ASSIGNED', 'CANCELLED'],
    TRUCK_ASSIGNED: ['GODOWN_ASSIGNED', 'PAYMENT_PENDING', 'CONFIRMED'],
    GODOWN_ASSIGNED: ['PAYMENT_PENDING', 'CONFIRMED'],
    PAYMENT_PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['DISPATCHED', 'CANCELLED'],
    DISPATCHED: ['IN_TRANSIT', 'FAILED'],
    IN_TRANSIT: ['AT_GODOWN', 'DELIVERED', 'FAILED'],
    AT_GODOWN: ['IN_TRANSIT', 'DELIVERED', 'FAILED'],
    DELIVERED: []
  };

  if (user?.role !== 'ADMIN' && validTransitions[oldStatus] && !validTransitions[oldStatus].includes(status)) {
    return res.status(400).json({
      error: 'INVALID_TRANSITION',
      message: `Direct transition from ${oldStatus} to ${status} is not permitted without administrator clearance.`
    });
  }

  // Automatic real-time Godown spatial capacity synchronization
  if (del.intermediateGodownId) {
    if (status === 'AT_GODOWN' && oldStatus !== 'AT_GODOWN') {
      const gdn = await dbService.getGodown(del.intermediateGodownId);
      if (gdn) {
        const newAvail = Math.max(0, gdn.availableCapacityKg - (del.goodsWeightKg || 0));
        await dbService.updateGodown(gdn.id, { availableCapacityKg: newAvail });
        await logAction(req, 'GODOWN_CAPACITY_DEC', `Deducted ${del.goodsWeightKg} kg at ${gdn.name} for inbound consignment ${del.id}`);
      }
    } else if (oldStatus === 'AT_GODOWN' && (status === 'IN_TRANSIT' || status === 'DELIVERED')) {
      const gdn = await dbService.getGodown(del.intermediateGodownId);
      if (gdn) {
        const newAvail = Math.min(gdn.totalCapacityKg, gdn.availableCapacityKg + (del.goodsWeightKg || 0));
        await dbService.updateGodown(gdn.id, { availableCapacityKg: newAvail });
        await logAction(req, 'GODOWN_CAPACITY_INC', `Restored ${del.goodsWeightKg} kg at ${gdn.name} for departed consignment ${del.id}`);
      }
    }
  }

  await dbService.updateDelivery(del.id, { status });
  del.status = status;
  await logAction(req, 'DELIVERY_STATUS', `Progressed order ${del.id} state to ${status}`);

  const customerNot: Notification = {
    id: `not_state_${Date.now()}`,
    userId: del.customerId,
    title: `Consignment Status: ${status}`,
    message: `Your transport consignment ${del.id} milestone tracking state is now: ${status}`,
    type: status === 'DELIVERED' ? 'SUCCESS' : 'INFO',
    read: false,
    createdAt: new Date().toISOString()
  };
  await dbService.createNotification(customerNot);

  res.json({ success: true, delivery: del });
});

apiRouter.post('/deliveries/:id/request-payment', checkRole(['ADMIN']), async (req: Request, res: Response) => {
  const del = await dbService.getDelivery(req.params.id);
  if (!del) return res.status(404).json({ error: 'NOT_FOUND' });

  await dbService.updateDelivery(del.id, { status: 'PAYMENT_PENDING' });
  del.status = 'PAYMENT_PENDING';
  await logAction(req, 'PMT_REQUEST', `Issued invoice billing checklist on shipment ${del.id}`);

  const pmtNot: Notification = {
    id: `not_pmt_${Date.now()}`,
    userId: del.customerId,
    title: 'Payment Invoice Surcharge Alert',
    message: `Delivery consignment ${del.id} is approved! Complete Razorpay payment to trigger transport operations.`,
    type: 'WARNING',
    read: false,
    createdAt: new Date().toISOString()
  };
  await dbService.createNotification(pmtNot);

  res.json({ success: true, delivery: del });
});

// ---------------- ALIGNMENT WORKSPACE (ASSIGNMENTS) ----------------
apiRouter.get('/assignments/recommendations/:deliveryId', checkRole(['ADMIN']), async (req: Request, res: Response) => {
  const [trucks, godowns] = await Promise.all([
    getOptimizedTrucks(req.params.deliveryId),
    getOptimizedGodowns(req.params.deliveryId)
  ]);
  res.json({ trucks, godowns });
});

apiRouter.post('/assignments/:deliveryId/assign-truck', checkRole(['ADMIN']), async (req: Request, res: Response) => {
  const { vehicleId, driverId } = req.body;
  if (!vehicleId || !driverId) {
    return res.status(400).json({ error: 'vehicleId and driverId are required.' });
  }

  try {
    const result = await dbService.assignDeliveryTruckTx(req.params.deliveryId, vehicleId, driverId);
    await logAction(req, 'TRUCK_ASSIGN', `Assigned vehicle ${vehicleId} / driver ${driverId} to freight trip ${req.params.deliveryId}`);
    res.json({ success: true, delivery: result.delivery, assignment: result.assignment });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Truck assignment transaction failed.' });
  }
});

apiRouter.post('/assignments/:deliveryId/assign-godown', checkRole(['ADMIN']), async (req: Request, res: Response) => {
  const { godownId } = req.body;
  if (!godownId) {
    return res.status(400).json({ error: 'godownId is required.' });
  }

  try {
    const result = await dbService.assignGodownCapacityTx(req.params.deliveryId, godownId);
    await logAction(req, 'GODOWN_ASSIGN', `Routed freight trip ${req.params.deliveryId} via staging point ${godownId}`);
    res.json({ success: true, delivery: result.delivery, godown: result.godown });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Warehouse capacity assignment transaction failed.' });
  }
});

apiRouter.post('/assignments/:deliveryId/override-ai', checkRole(['ADMIN']), async (req: Request, res: Response) => {
  const { vehicleId, driverId, godownId, overrideReason } = req.body;
  const del = await dbService.getDelivery(req.params.deliveryId);
  if (!del) return res.status(404).json({ error: 'NOT_FOUND' });

  const updates: Partial<Delivery> = { status: 'TRUCK_ASSIGNED' };
  if (vehicleId) updates.assignedVehicleId = vehicleId;
  if (driverId) updates.assignedDriverId = driverId;
  if (godownId) updates.intermediateGodownId = godownId;

  await dbService.updateDelivery(del.id, updates);
  Object.assign(del, updates);

  const newAss: Assignment = {
    id: `ass_${Date.now()}`,
    deliveryId: del.id,
    vehicleId,
    driverId,
    godownId,
    aiRecommended: false,
    overrideReason,
    assignedAt: new Date().toISOString()
  };
  await dbService.createAssignment(newAss);

  await logAction(req, 'AI_OVERRIDE', `Override dispatch routing optimization on ${del.id} with justification: "${overrideReason}"`);
  res.json({ success: true, delivery: del });
});

// ---------------- PAYMENTS & WEBHOOKS ----------------
apiRouter.post('/payments/create-order', checkRole(['BUSINESS_OWNER', 'ADMIN']), async (req: Request, res: Response) => {
  const { deliveryId } = req.body;
  const payment = await dbService.getPaymentByDeliveryId(deliveryId);
  if (!payment) return res.status(404).json({ error: 'NOT_FOUND' });

  res.json({ success: true, payment });
});

const handlePaymentCapture = async (req: Request, res: Response) => {
  const { deliveryId, paymentId } = req.body;
  const payment =
    (paymentId ? await dbService.getPayment(paymentId) : null) ||
    (deliveryId ? await dbService.getPaymentByDeliveryId(deliveryId) : null);

  if (!payment) return res.status(404).json({ error: 'NOT_FOUND', message: 'Payment record not found' });

  const paidAt = new Date().toISOString();
  const gatewayPaymentId = `pay_rzp_live_${Date.now()}`;
  await dbService.updatePayment(payment.id, {
    status: 'CAPTURED',
    gatewayPaymentId,
    paidAt
  });
  payment.status = 'CAPTURED';
  payment.gatewayPaymentId = gatewayPaymentId;
  payment.paidAt = paidAt;

  await dbService.updateDelivery(payment.deliveryId, { status: 'CONFIRMED' });

  const year = new Date().getFullYear();
  const uniqueCode = payment.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
  const newInv: Invoice = {
    id: `inv_${Date.now()}`,
    deliveryId: payment.deliveryId,
    paymentId: payment.id,
    invoiceNo: `FLEETR-INV-${year}-${uniqueCode}`,
    amount: payment.totalAmount,
    createdAt: new Date().toISOString()
  };
  await dbService.createInvoice(newInv);

  await logAction(req, 'PAYMENT_CAPTURE', `Confirmed receipt of cargo freight bills for shipment ${payment.deliveryId} (₹${payment.totalAmount})`);

  res.json({ success: true, payment, invoice: newInv });
};

apiRouter.post('/payments/capture', checkRole(['BUSINESS_OWNER', 'ADMIN']), handlePaymentCapture);
apiRouter.post('/payments/mock-success', checkRole(['BUSINESS_OWNER', 'ADMIN']), handlePaymentCapture);

apiRouter.get('/payments', checkRole(['BUSINESS_OWNER', 'TRUCK_OWNER', 'ADMIN']), async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  if (user.role === 'ADMIN') {
    const payments = await dbService.getPayments();
    return res.json({ payments });
  }
  const myDels = await dbService.getDeliveries({ customerId: user.id });
  const myDelIds = myDels.deliveries.map((d) => d.id);
  const payments = await dbService.getPayments(myDelIds);
  res.json({ payments });
});

// ---------------- INVOICES ----------------
apiRouter.get('/invoices', checkRole(['BUSINESS_OWNER', 'ADMIN']), async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  if (user.role === 'ADMIN') {
    const invoices = await dbService.getInvoices();
    return res.json({ invoices });
  }
  const myDels = await dbService.getDeliveries({ customerId: user.id });
  const myDelIds = myDels.deliveries.map((d) => d.id);
  const invoices = await dbService.getInvoices(myDelIds);
  res.json({ invoices });
});

apiRouter.get('/invoices/:id/download', async (req: Request, res: Response) => {
  const inv = await dbService.getInvoice(req.params.id);
  if (!inv) return res.status(404).json({ error: 'NOT_FOUND' });

  const [del, pmt] = await Promise.all([
    dbService.getDelivery(inv.deliveryId),
    dbService.getPayment(inv.paymentId)
  ]);

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename=Fleetr_Invoice_${inv.invoiceNo}.txt`);

  const receiptBody = `----------------------------------------
       FLEETR LOGISTICS SAAS PLATFORM
       COMMERCIAL FREIGHT BILL & LR RECEIPT
----------------------------------------
INVOICE NO   : ${inv.invoiceNo}
DATE CODE    : ${inv.createdAt}
CARGO WEIGHT : ${del?.goodsWeightKg || 'N/A'} kg
CARGO VOLUME : ${del?.goodsVolumeCubicCm || 'N/A'} cubic cm
PICKUP AREA  : ${del?.pickupLocation || 'N/A'}
DESTINATION  : ${del?.destinationLocation || 'N/A'}

----------------------------------------
RATE LOG BREAKDOWN
----------------------------------------
DISTANCE METRIC   : ${pmt?.distanceKm || 0} km
BASE FREIGHT RATE : INR ${pmt?.baseFreight || 0}
TOLL EXTRA CHARGE : INR ${pmt?.tollSurcharge || 0}
GST RATE TAX (18%): APPLIED
TDS REBATE  (2%)  : SAVED
----------------------------------------
TOTAL COLLECTED   : INR ${inv.amount}
LR CHECKPAY STATUS: CAPTURED (Razorpay Verified)
----------------------------------------
         SAFE TRANSIT ASSURED BY NLDS
`;
  res.send(receiptBody);
});

// ---------------- NOTIFICATIONS ----------------
apiRouter.get('/notifications', async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  if (!user) {
    return res.json({ notifications: [] });
  }
  const notifications = await dbService.getNotifications(user.id);
  res.json({ notifications });
});

apiRouter.patch('/notifications/:id/read', async (req: Request, res: Response) => {
  await dbService.updateNotification(req.params.id, { read: true });
  res.json({ success: true });
});

// ---------------- ULIP GATEWAYS PROXY ENDPOINTS ----------------
apiRouter.post('/ulip/vahan/vehicle', (req: Request, res: Response) => {
  const { vehicleNumber } = req.body;
  res.json(verifyVahan(vehicleNumber));
});

apiRouter.post('/ulip/sarathi', (req: Request, res: Response) => {
  const { dlnumber, dob } = req.body;
  res.json(verifySarathi(dlnumber, dob));
});

apiRouter.post('/ulip/fastag/details', (req: Request, res: Response) => {
  const { vehiclenumber, tagid } = req.body;
  res.json(checkFastag(vehiclenumber, tagid));
});

apiRouter.post('/ulip/echallan', (req: Request, res: Response) => {
  const { vehicleNumber } = req.body;
  res.json(verifyEChallan(vehicleNumber));
});

apiRouter.post('/ulip/aaiclas/export', (req: Request, res: Response) => {
  const { awbNumber, location } = req.body;
  res.json(verifyAaiclas(awbNumber, location));
});

// ---------------- FLEETR-MIND INTELLIGENCE & AUDITS ----------------
apiRouter.get('/admin/global-search', checkRole(['ADMIN']), async (req: Request, res: Response) => {
  const queryStr = (req.query.q as string || '').toLowerCase().trim();
  if (!queryStr) {
    return res.json({ vehicles: [], deliveries: [], godowns: [] });
  }

  const [vehicles, deliveries, godowns] = await Promise.all([
    dbService.getVehicles(),
    dbService.getDeliveries(),
    dbService.getGodowns()
  ]);

  const matchingVehicles = vehicles.filter((v) =>
    v.vehicleNumber?.toLowerCase().includes(queryStr)
  );
  const matchingDeliveries = deliveries.filter((d) =>
    d.id?.toLowerCase().includes(queryStr)
  );
  const matchingGodowns = godowns.filter((g) =>
    g.name?.toLowerCase().includes(queryStr)
  );

  res.json({
    vehicles: matchingVehicles,
    deliveries: matchingDeliveries,
    godowns: matchingGodowns
  });
});

apiRouter.get('/ai/anomalies', checkRole(['ADMIN']), async (req: Request, res: Response) => {
  const anomalies = await getAnomalies();
  res.json({ anomalies });
});

apiRouter.get('/ai/demand-forecast', checkRole(['ADMIN', 'TRUCK_OWNER', 'GODOWN_OWNER']), (req: Request, res: Response) => {
  res.json(getDemandForecast());
});

apiRouter.get('/audit', checkRole(['ADMIN']), async (req: Request, res: Response) => {
  const auditLogs = await dbService.getAuditLogs();
  res.json({ auditLogs });
});

// REAL-TIME GEOSPATIAL ROUTING & PROXIMITY ENGINE
apiRouter.post('/routing/analyze', async (req: Request, res: Response) => {
  try {
    const { pickupLocation, destinationLocation, cargoWeightKg, cargoCategory, deliveryId } = req.body;
    if (!pickupLocation || !destinationLocation) {
      return res.status(400).json({ error: 'MISSING_LOCATIONS', message: 'Pickup location and destination location are required.' });
    }

    const result = await executeRealtimeRoutingAnalysis({
      pickupLocation,
      destinationLocation,
      cargoWeightKg: Number(cargoWeightKg) || 8000,
      cargoCategory: cargoCategory || 'General Goods',
      deliveryId
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Error in /routing/analyze:', err);
    res.status(500).json({ error: 'ROUTING_ANALYSIS_FAILED', message: err.message || 'Failed to complete realtime routing analysis' });
  }
});

apiRouter.get('/routing/corridor/:deliveryId', async (req: Request, res: Response) => {
  try {
    const { deliveryId } = req.params;
    const delivery = await dbService.getDelivery(deliveryId);
    if (!delivery) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Delivery consignment not found.' });
    }

    const result = await executeRealtimeRoutingAnalysis({
      pickupLocation: delivery.pickupLocation,
      destinationLocation: delivery.destinationLocation,
      cargoWeightKg: delivery.goodsWeightKg,
      cargoCategory: delivery.goodsCategory,
      deliveryId: delivery.id
    });

    res.json({ success: true, delivery, ...result });
  } catch (err: any) {
    console.error('Error in /routing/corridor/:deliveryId:', err);
    res.status(500).json({ error: 'ROUTING_CORRIDOR_FAILED', message: err.message || 'Failed to analyze delivery corridor' });
  }
});

apiRouter.get('/fleet/live-tracking', async (req: Request, res: Response) => {
  try {
    const vehicles = await dbService.getVehicles();
    const liveFleet = vehicles.map((veh, idx) => {
      const telemetry = enrichVehicleTelemetry(veh, idx);
      return {
        ...veh,
        currentLat: telemetry.lat,
        currentLng: telemetry.lng,
        currentLocationName: telemetry.locationName,
        speedKmh: telemetry.speed,
        status: telemetry.status
      };
    });
    res.json({ success: true, fleet: liveFleet });
  } catch (err: any) {
    console.error('Error in /fleet/live-tracking:', err);
    res.status(500).json({ error: 'FLEET_TRACKING_FAILED', message: err.message || 'Failed to retrieve live fleet tracking' });
  }
});

apiRouter.post('/fleet/:vehicleId/telemetry', async (req: Request, res: Response) => {
  try {
    const { vehicleId } = req.params;
    const { lat, lng, locationName, speedKmh, status } = req.body;
    const vehicle = await dbService.getVehicle(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Vehicle not found.' });
    }

    const updatedVehicle: Vehicle = {
      ...vehicle,
      currentLat: lat !== undefined ? Number(lat) : vehicle.currentLat,
      currentLng: lng !== undefined ? Number(lng) : vehicle.currentLng,
      currentLocationName: locationName || vehicle.currentLocationName,
      speedKmh: speedKmh !== undefined ? Number(speedKmh) : vehicle.speedKmh,
      status: status || vehicle.status
    };

    await dbService.updateVehicle(vehicleId, updatedVehicle);
    res.json({ success: true, vehicle: updatedVehicle });
  } catch (err: any) {
    console.error('Error in /fleet/:vehicleId/telemetry:', err);
    res.status(500).json({ error: 'TELEMETRY_UPDATE_FAILED', message: err.message || 'Failed to update vehicle telemetry' });
  }
});

apiRouter.post('/whatsapp/send', async (req: Request, res: Response) => {
  const { phone, text } = req.body;
  if (!phone || !text) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'Phone and text are required for WhatsApp routing.' });
  }

  const cleanPhone = phone.replace(/[+\s-]/g, '');
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  await logAction(req, 'WHATSAPP_DISPATCH', `Outbound WhatsApp dispatched to ${cleanPhone}`);

  if (!phoneNumberId || !accessToken) {
    console.log(`[WhatsApp Fallback Log] Real dispatch to ${cleanPhone} bypassed. Keys missing. Message text: "${text}"`);
    return res.json({
      success: false,
      isMock: true,
      message: 'WhatsApp automated API credentials not configured in .env. Falling back to direct URL launching.',
      details: { phone: cleanPhone, text }
    });
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: {
          preview_url: false,
          body: text
        }
      })
    });

    const data = (await response.json()) as any;
    if (response.ok) {
      console.log(`[WhatsApp API Success] Dispatched message to +${cleanPhone}:`, data);
      await logAction(req, 'WHATSAPP_SUCCESS', `Successfully sent outbound WhatsApp message via Meta Cloud API to +${cleanPhone}`);
      return res.json({ success: true, isMock: false, data });
    } else {
      console.error(`[WhatsApp API Error Response]`, data);
      await logAction(req, 'WHATSAPP_ERROR', `Meta Cloud API rejected outbound dispatch to +${cleanPhone}: ${data.error?.message || 'Unknown error'}`);
      return res.status(response.status).json({
        success: false,
        error: 'META_REJECTED',
        message: data.error?.message || 'Meta API rejected message payload.',
        details: data
      });
    }
  } catch (err: any) {
    console.error(`[WhatsApp API Exception]`, err);
    await logAction(req, 'WHATSAPP_CRITICAL', `Failed to make request to Meta API point for +${cleanPhone}: ${err.message}`);
    return res.status(500).json({
      success: false,
      error: 'CRITICAL_EXCEPTION',
      message: err.message || 'Failed to request outbound WhatsApp gateway.'
    });
  }
});

// ---------------- FREE-TIER OPTIMIZED AGGREGATE STATS ----------------
apiRouter.get('/stats/dashboard', async (req: Request, res: Response) => {
  try {
    const stats = await dbService.getDashboardStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve metrics' });
  }
});

// ---------------- CUSTOMER SERVICE & SUPPORT TICKETS ----------------
apiRouter.post('/support/tickets', async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'UNAUTHORIZED' });

  const { deliveryId, category, priority, subject, description } = req.body;
  if (!subject || !description) {
    return res.status(400).json({ error: 'Subject and description are required.' });
  }

  const ticket: SupportTicket = {
    id: `tkt_${Date.now()}`,
    deliveryId: deliveryId || undefined,
    raisedBy: user.id,
    raisedByName: user.name,
    raisedByEmail: user.email,
    raisedByRole: user.role,
    category: category || 'GENERAL_DISPUTE',
    priority: priority || 'MEDIUM',
    subject,
    description,
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await dbService.createSupportTicket(ticket);
  await logAction(req, 'SUPPORT_TICKET_RAISE', `Support ticket ${ticket.id} (${ticket.category}) opened by ${user.name}`);
  res.json({ success: true, ticket });
});

apiRouter.get('/support/tickets', async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'UNAUTHORIZED' });

  const filter = user.role === 'ADMIN' ? undefined : { raisedBy: user.id };
  const tickets = await dbService.getSupportTickets(filter);
  res.json({ tickets });
});

apiRouter.patch('/support/tickets/:id', async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'UNAUTHORIZED' });

  const { status, adminNotes } = req.body;
  const updates: Partial<SupportTicket> = {};
  if (status) updates.status = status;
  if (adminNotes !== undefined) updates.adminNotes = adminNotes;
  if (status === 'RESOLVED' || status === 'CLOSED') {
    updates.resolvedAt = new Date().toISOString();
  }

  await dbService.updateSupportTicket(req.params.id, updates);
  await logAction(req, 'SUPPORT_TICKET_UPDATE', `Ticket ${req.params.id} updated by ${user.name} to status ${status}`);
  res.json({ success: true });
});
