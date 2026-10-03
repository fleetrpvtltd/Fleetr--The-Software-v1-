/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  orderBy,
  startAfter,
  documentId,
  QueryConstraint,
  runTransaction,
  writeBatch
} from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth, sanitizeForFirestore } from '../lib/firebase';
import {
  User,
  Vehicle,
  Driver,
  Godown,
  Delivery,
  Assignment,
  Payment,
  Invoice,
  Notification,
  AuditLog,
  SupportTicket,
  DashboardStats
} from '../types';

export interface VehicleFilterOptions {
  ownerId?: string;
  limitCount?: number;
  startAfterCursor?: string;
}

export interface DeliveryFilterOptions {
  customerId?: string;
  vehicleIds?: string[];
  godownIds?: string[];
  driverIds?: string[];
  status?: string;
  limitCount?: number;
  startAfterCursor?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

export class DbService {
  private isSeeded = false;

  get isInitialized(): boolean {
    return this.isSeeded;
  }

  get users(): User[] {
    return this.isSeeded ? [{ id: 'usr_admin' } as User] : [];
  }

  async init(): Promise<void> {
    await this.ensureSeedData();
  }

  // ---------------- AUTHENTICATION & SEEDING ----------------
  async authenticateServer() {
    let adminUid: string | null = auth.currentUser?.uid || null;
    const adminPass = process.env.ADMIN_PASSWORD;
    if (!adminPass) {
      return null;
    }

    if (!adminUid) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, 'emonpoddar01@gmail.com', adminPass);
        adminUid = userCredential.user.uid;
      } catch (err: any) {
        if (
          err.code === 'auth/user-not-found' ||
          err.code === 'auth/invalid-credential' ||
          err.code === 'auth/wrong-password'
        ) {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, 'emonpoddar01@gmail.com', adminPass);
            adminUid = userCredential.user.uid;
          } catch (regErr: any) {
            if (regErr.code === 'auth/email-already-in-use') {
              adminUid = auth.currentUser?.uid || 'usr_admin';
            }
          }
        }
      }
    }

    return adminUid;
  }

  async ensureSeedData() {
    if (this.isSeeded) return;

    try {
      await this.authenticateServer().catch(() => {});

      const adminSnap = await getDoc(doc(db, 'users', 'usr_admin'));
      if (!adminSnap.exists()) {
        const seedAdmin: User = {
          id: 'usr_admin',
          name: 'Emon Poddar',
          email: 'emonpoddar01@gmail.com',
          phone: '+919876543210',
          role: 'ADMIN',
          status: 'ACTIVE',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', 'usr_admin'), sanitizeForFirestore(seedAdmin)).catch(() => {});
      }

      this.isSeeded = true;
    } catch (err) {
      console.warn('ensureSeedData notice:', err);
    }
  }

  // ---------------- USERS (DIRECT FIRESTORE SDK) ----------------
  async getUser(id: string): Promise<User | null> {
    try {
      const snap = await getDoc(doc(db, 'users', id));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as User;
      }
      const q = query(collection(db, 'users'), where('id', '==', id), limit(1));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        return { id: qSnap.docs[0].id, ...qSnap.docs[0].data() } as User;
      }
      return null;
    } catch (err) {
      console.error(`getUser(${id}) error:`, err);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as User;
    } catch (err) {
      console.error(`getUserByEmail(${email}) error:`, err);
      return null;
    }
  }

  async getUserByRole(role: string): Promise<User | null> {
    try {
      const q = query(collection(db, 'users'), where('role', '==', role), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as User;
    } catch (err) {
      console.error(`getUserByRole(${role}) error:`, err);
      return null;
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      const snap = await getDocs(collection(db, 'users'));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as User));
    } catch (err) {
      console.error('getUsers error:', err);
      return [];
    }
  }

  async setUser(id: string, user: Partial<User>): Promise<void> {
    await setDoc(doc(db, 'users', id), sanitizeForFirestore(user), { merge: true });
  }

  async updateUser(id: string, data: Partial<User>): Promise<void> {
    try {
      // 1. Update direct doc
      const docRef = doc(db, 'users', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        await setDoc(docRef, sanitizeForFirestore(data), { merge: true });
        return;
      }
      // 2. Query by 'id' property
      const q = query(collection(db, 'users'), where('id', '==', id), limit(1));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        await setDoc(qSnap.docs[0].ref, sanitizeForFirestore(data), { merge: true });
        return;
      }
      // 3. Fallback setDoc
      await setDoc(docRef, sanitizeForFirestore(data), { merge: true });
    } catch (err) {
      console.error(`updateUser(${id}) error:`, err);
      throw err;
    }
  }

  async deleteUserCascade(userId: string): Promise<{ deletedCounts: Record<string, number> }> {
    const user = (await this.getUser(userId)) || (await this.getUserByEmail(userId));
    if (!user) {
      throw new Error(`User with ID or email ${userId} not found in database.`);
    }

    if (
      user.role === 'ADMIN' ||
      user.id === 'usr_admin' ||
      user.email === 'emonpoddar01@gmail.com' ||
      user.email === 'nilavra.s2007@gmail.com'
    ) {
      throw new Error('Master Admin account is protected and cannot be deleted.');
    }

    const counts: Record<string, number> = {
      deliveries: 0,
      assignments: 0,
      payments: 0,
      invoices: 0,
      vehicles: 0,
      drivers: 0,
      godowns: 0,
      notifications: 0,
    };

    // Gather all possible identifiers for this user
    const identifiers = Array.from(new Set([userId, user.id, user.email].filter(Boolean) as string[]));

    // 1. Purge Deliveries and their cascading assignments, payments, and invoices
    for (const ident of identifiers) {
      try {
        const delSnap = await getDocs(query(collection(db, 'deliveries'), where('customerId', '==', ident)));
        for (const delDoc of delSnap.docs) {
          const delId = delDoc.id;

          // Delete assignments
          const assSnap = await getDocs(query(collection(db, 'assignments'), where('deliveryId', '==', delId)));
          for (const assDoc of assSnap.docs) {
            await deleteDoc(assDoc.ref).catch(() => {});
            counts.assignments++;
          }

          // Delete payments
          const paySnap = await getDocs(query(collection(db, 'payments'), where('deliveryId', '==', delId)));
          for (const payDoc of paySnap.docs) {
            await deleteDoc(payDoc.ref).catch(() => {});
            counts.payments++;
          }

          // Delete invoices
          const invSnap = await getDocs(query(collection(db, 'invoices'), where('deliveryId', '==', delId)));
          for (const invDoc of invSnap.docs) {
            await deleteDoc(invDoc.ref).catch(() => {});
            counts.invoices++;
          }

          await deleteDoc(delDoc.ref).catch(() => {});
          counts.deliveries++;
        }
      } catch (err) {
        console.warn('Error deleting user deliveries cascade:', err);
      }
    }

    // 2. Purge Fleet Vehicles and their assignments
    for (const ident of identifiers) {
      try {
        const vehSnap = await getDocs(query(collection(db, 'vehicles'), where('ownerId', '==', ident)));
        for (const vehDoc of vehSnap.docs) {
          const assSnap = await getDocs(query(collection(db, 'assignments'), where('vehicleId', '==', vehDoc.id)));
          for (const assDoc of assSnap.docs) {
            await deleteDoc(assDoc.ref).catch(() => {});
            counts.assignments++;
          }

          // Clear any active assignment reference in deliveries
          const assignedDels = await getDocs(query(collection(db, 'deliveries'), where('assignedVehicleId', '==', vehDoc.id)));
          for (const aDel of assignedDels.docs) {
            await updateDoc(aDel.ref, { assignedVehicleId: null }).catch(() => {});
          }

          await deleteDoc(vehDoc.ref).catch(() => {});
          counts.vehicles++;
        }
      } catch (err) {
        console.warn('Error deleting user fleet cascade:', err);
      }
    }

    // 3. Purge Drivers and unassign from deliveries
    for (const ident of identifiers) {
      try {
        const drvSnap = await getDocs(query(collection(db, 'drivers'), where('ownerId', '==', ident)));
        for (const drvDoc of drvSnap.docs) {
          const assSnap = await getDocs(query(collection(db, 'assignments'), where('driverId', '==', drvDoc.id)));
          for (const assDoc of assSnap.docs) {
            await deleteDoc(assDoc.ref).catch(() => {});
            counts.assignments++;
          }

          const assignedDels = await getDocs(query(collection(db, 'deliveries'), where('assignedDriverId', '==', drvDoc.id)));
          for (const aDel of assignedDels.docs) {
            await updateDoc(aDel.ref, { assignedDriverId: null }).catch(() => {});
          }

          await deleteDoc(drvDoc.ref).catch(() => {});
          counts.drivers++;
        }
      } catch (err) {
        console.warn('Error deleting user drivers cascade:', err);
      }
    }

    // 4. Purge Godowns and unassign intermediate staging
    for (const ident of identifiers) {
      try {
        const gdnSnap = await getDocs(query(collection(db, 'godowns'), where('ownerId', '==', ident)));
        for (const gdnDoc of gdnSnap.docs) {
          const assSnap = await getDocs(query(collection(db, 'assignments'), where('godownId', '==', gdnDoc.id)));
          for (const assDoc of assSnap.docs) {
            await deleteDoc(assDoc.ref).catch(() => {});
            counts.assignments++;
          }

          const stagingDels = await getDocs(query(collection(db, 'deliveries'), where('intermediateGodownId', '==', gdnDoc.id)));
          for (const sDel of stagingDels.docs) {
            await updateDoc(sDel.ref, { intermediateGodownId: null }).catch(() => {});
          }

          await deleteDoc(gdnDoc.ref).catch(() => {});
          counts.godowns++;
        }
      } catch (err) {
        console.warn('Error deleting user godowns cascade:', err);
      }
    }

    // 5. Purge Notifications
    for (const ident of identifiers) {
      try {
        const notifSnap = await getDocs(query(collection(db, 'notifications'), where('userId', '==', ident)));
        for (const notifDoc of notifSnap.docs) {
          await deleteDoc(notifDoc.ref).catch(() => {});
          counts.notifications++;
        }
      } catch (err) {
        console.warn('Error deleting user notifications:', err);
      }
    }

    // 6. Delete User document(s) from Firestore
    try {
      await deleteDoc(doc(db, 'users', userId)).catch(() => {});
      if (user.id && user.id !== userId) {
        await deleteDoc(doc(db, 'users', user.id)).catch(() => {});
      }
      if (user.email) {
        const emailDocs = await getDocs(query(collection(db, 'users'), where('email', '==', user.email)));
        for (const eDoc of emailDocs.docs) {
          await deleteDoc(eDoc.ref).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Error deleting user doc from Firestore:', err);
    }

    // 7. Delete from Firebase Authentication (with timeout safeguard)
    try {
      const { adminAuth } = await import('./firebaseAdmin');
      await Promise.race([
        adminAuth.deleteUser(user.id || userId),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Auth delete timeout')), 2500))
      ]).catch(() => {});
    } catch (authErr) {
      console.warn(`Could not delete user ${userId} from Firebase Auth:`, authErr);
    }

    return { deletedCounts: counts };
  }

  // ---------------- VEHICLES (DIRECT FIRESTORE SDK) ----------------
  async getVehicle(id: string): Promise<Vehicle | null> {
    try {
      const snap = await getDoc(doc(db, 'vehicles', id));
      if (!snap.exists()) return null;
      return snap.data() as Vehicle;
    } catch (err) {
      console.error(`getVehicle(${id}) error:`, err);
      return null;
    }
  }

  async getVehicles(
    ownerIdOrOptions?: string | VehicleFilterOptions
  ): Promise<{ vehicles: Vehicle[]; nextCursor: string | null; hasMore: boolean } & Vehicle[]> {
    try {
      const options = typeof ownerIdOrOptions === 'string'
        ? { ownerId: ownerIdOrOptions }
        : ownerIdOrOptions;

      const pageSize = options?.limitCount && options.limitCount > 0 ? options.limitCount : 20;
      const constraints: QueryConstraint[] = [];

      if (options?.ownerId) {
        constraints.push(where('ownerId', '==', options.ownerId));
      }

      // Order by document ID for stable pagination without needing custom composite indexes
      constraints.push(orderBy(documentId()));

      if (options?.startAfterCursor) {
        try {
          const cursorSnap = await getDoc(doc(db, 'vehicles', options.startAfterCursor));
          if (cursorSnap.exists()) {
            constraints.push(startAfter(cursorSnap));
          } else {
            constraints.push(startAfter(options.startAfterCursor));
          }
        } catch {
          constraints.push(startAfter(options.startAfterCursor));
        }
      }

      // Fetch limitCount + 1 to determine if subsequent records exist
      constraints.push(limit(pageSize + 1));

      const q = query(collection(db, 'vehicles'), ...constraints);
      const snap = await getDocs(q);

      const docs = snap.docs;
      const hasMore = docs.length > pageSize;
      const resultDocs = hasMore ? docs.slice(0, pageSize) : docs;
      const vehicles = resultDocs.map((d) => d.data() as Vehicle);

      const lastDoc = resultDocs[resultDocs.length - 1];
      const nextCursor = hasMore && lastDoc ? lastDoc.id : null;

      const output = Object.assign(vehicles, {
        vehicles,
        nextCursor,
        hasMore
      });
      return output as any;
    } catch (err) {
      console.error('getVehicles error:', err);
      const empty: Vehicle[] = [];
      return Object.assign(empty, {
        vehicles: empty,
        nextCursor: null,
        hasMore: false
      }) as any;
    }
  }

  async createVehicle(vehicle: Vehicle): Promise<Vehicle> {
    await setDoc(doc(db, 'vehicles', vehicle.id), sanitizeForFirestore(vehicle));
    return vehicle;
  }

  async updateVehicle(id: string, data: Partial<Vehicle>): Promise<void> {
    await updateDoc(doc(db, 'vehicles', id), sanitizeForFirestore(data));
  }

  // ---------------- DRIVERS (DIRECT FIRESTORE SDK) ----------------
  async getDriver(id: string): Promise<Driver | null> {
    try {
      const snap = await getDoc(doc(db, 'drivers', id));
      if (!snap.exists()) return null;
      return snap.data() as Driver;
    } catch (err) {
      console.error(`getDriver(${id}) error:`, err);
      return null;
    }
  }

  async getDrivers(ownerId?: string): Promise<Driver[]> {
    try {
      const q = ownerId
        ? query(collection(db, 'drivers'), where('ownerId', '==', ownerId))
        : collection(db, 'drivers');
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as Driver);
    } catch (err) {
      console.error('getDrivers error:', err);
      return [];
    }
  }

  async createDriver(driver: Driver): Promise<Driver> {
    await setDoc(doc(db, 'drivers', driver.id), sanitizeForFirestore(driver));
    return driver;
  }

  async updateDriver(id: string, data: Partial<Driver>): Promise<void> {
    await updateDoc(doc(db, 'drivers', id), sanitizeForFirestore(data));
  }

  // ---------------- GODOWNS (DIRECT FIRESTORE SDK) ----------------
  async getGodown(id: string): Promise<Godown | null> {
    try {
      const snap = await getDoc(doc(db, 'godowns', id));
      if (!snap.exists()) return null;
      return snap.data() as Godown;
    } catch (err) {
      console.error(`getGodown(${id}) error:`, err);
      return null;
    }
  }

  async getGodowns(ownerId?: string): Promise<Godown[]> {
    try {
      const q = ownerId
        ? query(collection(db, 'godowns'), where('ownerId', '==', ownerId))
        : collection(db, 'godowns');
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as Godown);
    } catch (err) {
      console.error('getGodowns error:', err);
      return [];
    }
  }

  async createGodown(godown: Godown): Promise<Godown> {
    await setDoc(doc(db, 'godowns', godown.id), sanitizeForFirestore(godown));
    return godown;
  }

  async updateGodown(id: string, data: Partial<Godown>): Promise<void> {
    await updateDoc(doc(db, 'godowns', id), sanitizeForFirestore(data));
  }

  // ---------------- DELIVERIES (DIRECT FIRESTORE SDK) ----------------
  async getDelivery(id: string): Promise<Delivery | null> {
    try {
      const snap = await getDoc(doc(db, 'deliveries', id));
      if (!snap.exists()) return null;
      return snap.data() as Delivery;
    } catch (err) {
      console.error(`getDelivery(${id}) error:`, err);
      return null;
    }
  }

  async getDeliveries(
    filter?: DeliveryFilterOptions
  ): Promise<{ deliveries: Delivery[]; nextCursor: string | null; hasMore: boolean } & Delivery[]> {
    try {
      const pageSize = filter?.limitCount && filter.limitCount > 0 ? filter.limitCount : 20;
      const constraints: QueryConstraint[] = [];

      if (filter?.customerId) {
        constraints.push(where('customerId', '==', filter.customerId));
      } else if (filter?.status) {
        constraints.push(where('status', '==', filter.status));
      } else if (filter?.vehicleIds && filter.vehicleIds.length > 0) {
        if (filter.vehicleIds.length === 1) {
          constraints.push(where('assignedVehicleId', '==', filter.vehicleIds[0]));
        } else if (filter.vehicleIds.length <= 10) {
          constraints.push(where('assignedVehicleId', 'in', filter.vehicleIds));
        }
      } else if (filter?.godownIds && filter.godownIds.length > 0) {
        if (filter.godownIds.length === 1) {
          constraints.push(where('intermediateGodownId', '==', filter.godownIds[0]));
        } else if (filter.godownIds.length <= 10) {
          constraints.push(where('intermediateGodownId', 'in', filter.godownIds));
        }
      }

      // Order by document ID for stable pagination without needing custom composite indexes
      constraints.push(orderBy(documentId()));

      if (filter?.startAfterCursor) {
        try {
          const cursorSnap = await getDoc(doc(db, 'deliveries', filter.startAfterCursor));
          if (cursorSnap.exists()) {
            constraints.push(startAfter(cursorSnap));
          } else {
            constraints.push(startAfter(filter.startAfterCursor));
          }
        } catch {
          constraints.push(startAfter(filter.startAfterCursor));
        }
      }

      // Fetch limitCount + 1 to determine if subsequent records exist
      constraints.push(limit(pageSize + 1));

      const q = query(collection(db, 'deliveries'), ...constraints);
      const snap = await getDocs(q);

      const docs = snap.docs;
      const hasMore = docs.length > pageSize;
      const resultDocs = hasMore ? docs.slice(0, pageSize) : docs;
      let deliveries = resultDocs.map((d) => d.data() as Delivery);

      // In case vehicleIds or godownIds had more than 10 items, apply filter safely
      if (filter?.vehicleIds && filter.vehicleIds.length > 10) {
        deliveries = deliveries.filter((d) => d.assignedVehicleId && filter.vehicleIds!.includes(d.assignedVehicleId));
      }
      if (filter?.godownIds && filter.godownIds.length > 10) {
        deliveries = deliveries.filter((d) => d.intermediateGodownId && filter.godownIds!.includes(d.intermediateGodownId));
      }

      const lastDoc = resultDocs[resultDocs.length - 1];
      const nextCursor = hasMore && lastDoc ? lastDoc.id : null;

      const output = Object.assign(deliveries, {
        deliveries,
        nextCursor,
        hasMore
      });
      return output as any;
    } catch (err) {
      console.error('getDeliveries error:', err);
      const empty: Delivery[] = [];
      return Object.assign(empty, {
        deliveries: empty,
        nextCursor: null,
        hasMore: false
      }) as any;
    }
  }

  async createDelivery(delivery: Delivery): Promise<Delivery> {
    await setDoc(doc(db, 'deliveries', delivery.id), sanitizeForFirestore(delivery));
    return delivery;
  }

  async updateDelivery(id: string, data: Partial<Delivery>): Promise<void> {
    await updateDoc(doc(db, 'deliveries', id), sanitizeForFirestore(data));
  }

  // ---------------- ASSIGNMENTS (DIRECT FIRESTORE SDK) ----------------
  async getAssignments(deliveryId?: string): Promise<Assignment[]> {
    try {
      const q = deliveryId
        ? query(collection(db, 'assignments'), where('deliveryId', '==', deliveryId))
        : collection(db, 'assignments');
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as Assignment);
    } catch (err) {
      console.error('getAssignments error:', err);
      return [];
    }
  }

  async createAssignment(assignment: Assignment): Promise<Assignment> {
    await setDoc(doc(db, 'assignments', assignment.id), sanitizeForFirestore(assignment));
    return assignment;
  }

  // ---------------- PAYMENTS (DIRECT FIRESTORE SDK) ----------------
  async getPayment(id: string): Promise<Payment | null> {
    try {
      const snap = await getDoc(doc(db, 'payments', id));
      if (!snap.exists()) return null;
      return snap.data() as Payment;
    } catch (err) {
      console.error(`getPayment(${id}) error:`, err);
      return null;
    }
  }

  async getPaymentByDeliveryId(deliveryId: string): Promise<Payment | null> {
    try {
      const q = query(collection(db, 'payments'), where('deliveryId', '==', deliveryId), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      return snap.docs[0].data() as Payment;
    } catch (err) {
      console.error(`getPaymentByDeliveryId(${deliveryId}) error:`, err);
      return null;
    }
  }

  async getPayments(deliveryIds?: string[]): Promise<Payment[]> {
    try {
      const snap = await getDocs(collection(db, 'payments'));
      let list = snap.docs.map((d) => d.data() as Payment);
      if (deliveryIds && deliveryIds.length > 0) {
        list = list.filter((p) => deliveryIds.includes(p.deliveryId));
      }
      return list;
    } catch (err) {
      console.error('getPayments error:', err);
      return [];
    }
  }

  async createPayment(payment: Payment): Promise<Payment> {
    await setDoc(doc(db, 'payments', payment.id), sanitizeForFirestore(payment));
    return payment;
  }

  async updatePayment(id: string, data: Partial<Payment>): Promise<void> {
    await updateDoc(doc(db, 'payments', id), sanitizeForFirestore(data));
  }

  // ---------------- INVOICES (DIRECT FIRESTORE SDK) ----------------
  async getInvoice(id: string): Promise<Invoice | null> {
    try {
      const snap = await getDoc(doc(db, 'invoices', id));
      if (!snap.exists()) return null;
      return snap.data() as Invoice;
    } catch (err) {
      console.error(`getInvoice(${id}) error:`, err);
      return null;
    }
  }

  async getInvoiceByDeliveryId(deliveryId: string): Promise<Invoice | null> {
    try {
      const q = query(collection(db, 'invoices'), where('deliveryId', '==', deliveryId), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      return snap.docs[0].data() as Invoice;
    } catch (err) {
      console.error(`getInvoiceByDeliveryId(${deliveryId}) error:`, err);
      return null;
    }
  }

  async getInvoices(deliveryIds?: string[]): Promise<Invoice[]> {
    try {
      const snap = await getDocs(collection(db, 'invoices'));
      let list = snap.docs.map((d) => d.data() as Invoice);
      if (deliveryIds) {
        if (deliveryIds.length === 0) return [];
        list = list.filter((inv) => deliveryIds.includes(inv.deliveryId));
      }
      return list;
    } catch (err) {
      console.error('getInvoices error:', err);
      return [];
    }
  }

  async createInvoice(invoice: Invoice): Promise<Invoice> {
    await setDoc(doc(db, 'invoices', invoice.id), sanitizeForFirestore(invoice));
    return invoice;
  }

  // ---------------- NOTIFICATIONS (DIRECT FIRESTORE SDK) ----------------
  async getNotifications(userId?: string): Promise<Notification[]> {
    try {
      const snap = await getDocs(collection(db, 'notifications'));
      let list = snap.docs.map((d) => d.data() as Notification);
      if (userId) {
        list = list.filter((n) => n.userId === userId || n.userId === 'usr_admin');
      }
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.error('getNotifications error:', err);
      return [];
    }
  }

  async createNotification(notification: Notification): Promise<Notification> {
    await setDoc(doc(db, 'notifications', notification.id), sanitizeForFirestore(notification));
    return notification;
  }

  async updateNotification(id: string, data: Partial<Notification>): Promise<void> {
    await updateDoc(doc(db, 'notifications', id), sanitizeForFirestore(data));
  }

  // ---------------- AUDIT LOGS (DIRECT FIRESTORE SDK) ----------------
  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const snap = await getDocs(collection(db, 'auditLogs'));
      return snap.docs
        .map((d) => d.data() as AuditLog)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (err) {
      console.error('getAuditLogs error:', err);
      return [];
    }
  }

  async createAuditLog(auditLog: AuditLog): Promise<AuditLog> {
    await setDoc(doc(db, 'auditLogs', auditLog.id), sanitizeForFirestore(auditLog));
    return auditLog;
  }

  // ---------------- FREE-TIER OPTIMIZED ATOMIC TRANSACTIONS ----------------
  async assignDeliveryTruckTx(
    deliveryId: string,
    vehicleId: string,
    driverId: string
  ): Promise<{ delivery: Delivery; assignment: Assignment }> {
    return await runTransaction(db, async (transaction) => {
      const delRef = doc(db, 'deliveries', deliveryId);
      const vehRef = doc(db, 'vehicles', vehicleId);
      const drvRef = doc(db, 'drivers', driverId);

      const delSnap = await transaction.get(delRef);
      if (!delSnap.exists()) {
        throw new Error(`Consignment ${deliveryId} was not found.`);
      }
      const delivery = delSnap.data() as Delivery;

      if (delivery.assignedVehicleId && delivery.assignedVehicleId !== vehicleId) {
        throw new Error(`Consignment ${deliveryId} is already allocated to vehicle ${delivery.assignedVehicleId}.`);
      }

      const vehSnap = await transaction.get(vehRef);
      if (!vehSnap.exists()) {
        throw new Error(`Vehicle ${vehicleId} not registered in fleet.`);
      }
      const vehicle = vehSnap.data() as Vehicle;

      if (vehicle.isAvailable === false && vehicle.status === 'IN_TRANSIT') {
        throw new Error(`Vehicle ${vehicle.vehicleNumber} is currently in transit and cannot be double-booked.`);
      }

      const drvSnap = await transaction.get(drvRef);
      if (!drvSnap.exists()) {
        throw new Error(`Driver ${driverId} not registered.`);
      }
      const driver = drvSnap.data() as Driver;

      const assignment: Assignment = {
        id: `ass_${Date.now()}`,
        deliveryId,
        vehicleId,
        driverId,
        aiRecommended: false,
        assignedAt: new Date().toISOString(),
        status: 'ACTIVE'
      };

      const updatedDelivery: Partial<Delivery> = {
        status: 'TRUCK_ASSIGNED',
        assignedVehicleId: vehicleId,
        assignedDriverId: driverId
      };

      const updatedVehicle: Partial<Vehicle> = {
        isAvailable: false,
        status: 'IN_TRANSIT'
      };

      const assRef = doc(db, 'assignments', assignment.id);
      transaction.set(assRef, sanitizeForFirestore(assignment));
      transaction.update(delRef, sanitizeForFirestore(updatedDelivery));
      transaction.update(vehRef, sanitizeForFirestore(updatedVehicle));

      return {
        delivery: { ...delivery, ...updatedDelivery },
        assignment
      };
    });
  }

  async assignGodownCapacityTx(
    deliveryId: string,
    godownId: string
  ): Promise<{ delivery: Delivery; godown: Godown }> {
    return await runTransaction(db, async (transaction) => {
      const delRef = doc(db, 'deliveries', deliveryId);
      const gdnRef = doc(db, 'godowns', godownId);

      const delSnap = await transaction.get(delRef);
      if (!delSnap.exists()) {
        throw new Error(`Consignment ${deliveryId} not found.`);
      }
      const delivery = delSnap.data() as Delivery;

      const gdnSnap = await transaction.get(gdnRef);
      if (!gdnSnap.exists()) {
        throw new Error(`Warehouse facility ${godownId} not found.`);
      }
      const godown = gdnSnap.data() as Godown;

      const requiredKg = delivery.goodsWeightKg || 0;
      if (godown.availableCapacityKg < requiredKg) {
        throw new Error(
          `Insufficient warehouse space: ${godown.name} has only ${godown.availableCapacityKg}kg capacity available, but consignment requires ${requiredKg}kg.`
        );
      }

      const newAvailableKg = godown.availableCapacityKg - requiredKg;
      const updatedGodown: Partial<Godown> = {
        availableCapacityKg: newAvailableKg
      };

      const updatedDelivery: Partial<Delivery> = {
        status: 'GODOWN_ASSIGNED',
        intermediateGodownId: godownId
      };

      transaction.update(gdnRef, sanitizeForFirestore(updatedGodown));
      transaction.update(delRef, sanitizeForFirestore(updatedDelivery));

      return {
        delivery: { ...delivery, ...updatedDelivery },
        godown: { ...godown, ...updatedGodown }
      };
    });
  }

  async completeDeliveryTx(deliveryId: string): Promise<Delivery> {
    return await runTransaction(db, async (transaction) => {
      const delRef = doc(db, 'deliveries', deliveryId);
      const delSnap = await transaction.get(delRef);
      if (!delSnap.exists()) {
        throw new Error(`Consignment ${deliveryId} not found.`);
      }
      const delivery = delSnap.data() as Delivery;

      if (delivery.assignedVehicleId) {
        const vehRef = doc(db, 'vehicles', delivery.assignedVehicleId);
        const vehSnap = await transaction.get(vehRef);
        if (vehSnap.exists()) {
          transaction.update(vehRef, { isAvailable: true, status: 'IDLE' });
        }
      }

      if (delivery.intermediateGodownId && delivery.goodsWeightKg) {
        const gdnRef = doc(db, 'godowns', delivery.intermediateGodownId);
        const gdnSnap = await transaction.get(gdnRef);
        if (gdnSnap.exists()) {
          const gdn = gdnSnap.data() as Godown;
          const restoredKg = Math.min(gdn.totalCapacityKg, gdn.availableCapacityKg + delivery.goodsWeightKg);
          transaction.update(gdnRef, { availableCapacityKg: restoredKg });
        }
      }

      const updatedDelivery: Partial<Delivery> = {
        status: 'DELIVERED',
        deliveredAt: new Date().toISOString()
      };

      transaction.update(delRef, sanitizeForFirestore(updatedDelivery));
      return { ...delivery, ...updatedDelivery };
    });
  }

  // ---------------- FREE-TIER IN-MEMORY STATS CACHE (60s TTL) ----------------
  private statsCache: { data: DashboardStats; expiresAt: number } | null = null;

  async getDashboardStats(forceFresh = false): Promise<DashboardStats> {
    const now = Date.now();
    if (!forceFresh && this.statsCache && this.statsCache.expiresAt > now) {
      return this.statsCache.data;
    }

    try {
      // Check pre-computed summary doc first (cost: 1 read)
      const statDocRef = doc(db, 'stats', 'global_metrics');
      const statSnap = await getDoc(statDocRef);
      if (statSnap.exists()) {
        const data = statSnap.data() as DashboardStats;
        this.statsCache = { data, expiresAt: now + 60000 };
        return data;
      }
    } catch {
      // fallback to live aggregation
    }

    // Compute and cache live stats
    const [delSnap, vehSnap, gdnSnap, tktSnap] = await Promise.all([
      getDocs(collection(db, 'deliveries')),
      getDocs(collection(db, 'vehicles')),
      getDocs(collection(db, 'godowns')),
      getDocs(collection(db, 'supportTickets')).catch(() => ({ docs: [] } as any))
    ]);

    const deliveries = delSnap.docs.map((d) => d.data() as Delivery);
    const vehicles = vehSnap.docs.map((d) => d.data() as Vehicle);
    const godowns = gdnSnap.docs.map((d) => d.data() as Godown);
    const tickets = tktSnap.docs.map((d) => d.data() as SupportTicket);

    const totalDeliveries = deliveries.length;
    const activeDeliveries = deliveries.filter(
      (d) => d.status !== 'DELIVERED' && d.status !== 'CANCELLED' && d.status !== 'FAILED'
    ).length;
    const completedDeliveries = deliveries.filter((d) => d.status === 'DELIVERED').length;
    const totalFreightRevenue = deliveries.reduce((acc, d) => acc + (d.goodsValueInr ? d.goodsValueInr * 0.05 : 0), 0);
    const totalFleetVehicles = vehicles.length;
    const availableVehicles = vehicles.filter((v) => v.isAvailable !== false).length;
    const totalGodowns = godowns.length;
    const openSupportTickets = tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_REVIEW').length;

    const stats: DashboardStats = {
      totalDeliveries,
      activeDeliveries,
      completedDeliveries,
      totalFreightRevenue: Math.round(totalFreightRevenue),
      totalFleetVehicles,
      availableVehicles,
      totalGodowns,
      openSupportTickets,
      lastCalculatedAt: new Date().toISOString()
    };

    // Store pre-computed metrics doc
    setDoc(doc(db, 'stats', 'global_metrics'), sanitizeForFirestore(stats)).catch(() => {});
    this.statsCache = { data: stats, expiresAt: now + 60000 };
    return stats;
  }

  // ---------------- CUSTOMER SERVICE / SUPPORT TICKETS ----------------
  async createSupportTicket(ticket: SupportTicket): Promise<SupportTicket> {
    await setDoc(doc(db, 'supportTickets', ticket.id), sanitizeForFirestore(ticket));
    if (this.statsCache) {
      this.statsCache = null; // Invalidate stats cache
    }
    return ticket;
  }

  async getSupportTickets(filter?: { raisedBy?: string; status?: string }): Promise<SupportTicket[]> {
    try {
      let q = collection(db, 'supportTickets');
      const constraints: QueryConstraint[] = [];

      if (filter?.raisedBy) {
        constraints.push(where('raisedBy', '==', filter.raisedBy));
      } else if (filter?.status) {
        constraints.push(where('status', '==', filter.status));
      }

      constraints.push(limit(50));
      const snap = await getDocs(query(q, ...constraints));
      return snap.docs
        .map((d) => d.data() as SupportTicket)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.error('getSupportTickets error:', err);
      return [];
    }
  }

  async updateSupportTicket(id: string, data: Partial<SupportTicket>): Promise<void> {
    await updateDoc(doc(db, 'supportTickets', id), sanitizeForFirestore({ ...data, updatedAt: new Date().toISOString() }));
    if (this.statsCache) {
      this.statsCache = null;
    }
  }
}

export const dbService = new DbService();
export const dbStore = dbService;
