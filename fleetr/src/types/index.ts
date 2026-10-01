export enum UserRole {
  BUSINESS_OWNER = 'BUSINESS_OWNER',
  VEHICLE_OWNER = 'VEHICLE_OWNER',
  WAREHOUSE_OWNER = 'WAREHOUSE_OWNER',
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  phone?: string;
}

export enum OrderStatus {
  DRAFT = 'DRAFT',
  PENDING_PICKUP = 'PENDING_PICKUP',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  DELAYED = 'DELAYED',
  COMPLETED = 'COMPLETED'
}

export interface ConsentRecord {
  purpose: string;
  grantedAt: Date;
  granted: boolean;
}

export interface LorryReceipt {
  id: string;
  orderId: string;
  issuedAt: Date;
}

export interface FastagWaypoint {
  tollId: string;
  timestamp: Date;
  location: string;
}
