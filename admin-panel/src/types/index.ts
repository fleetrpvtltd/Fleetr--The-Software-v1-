export type UserRole = 'BUSINESS_OWNER' | 'TRUCK_OWNER' | 'GODOWN_OWNER' | 'ADMIN';
export type UserStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  gstin?: string;
  status: UserStatus;
  createdAt: string;
}

export interface BreachLog {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface PerformanceReport {
  entityId: string;
  tripsCompleted: number;
  onTimePercentage: number;
  revenueGenerated: number;
}
