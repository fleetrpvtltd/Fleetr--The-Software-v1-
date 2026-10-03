/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'BUSINESS_OWNER' | 'TRUCK_OWNER' | 'GODOWN_OWNER' | 'ADMIN';

export type UserStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED';

export type UrgencyLevel = 'STANDARD' | 'EXPRESS' | 'SAME_DAY';

export type DeliveryStatus =
  | 'REQUESTED'
  | 'ADMIN_REVIEWED'
  | 'TRUCK_ASSIGNED'
  | 'GODOWN_ASSIGNED'
  | 'PAYMENT_PENDING'
  | 'CONFIRMED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'AT_GODOWN'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  gstin?: string;
  organizationName?: string;
  address?: string;
  status: UserStatus;
  createdAt: string;
  businessProfile?: BusinessProfile;
  truckOwnerProfile?: TruckOwnerProfile;
  godownOwnerProfile?: GodownOwnerProfile;
}

export interface BusinessProfile {
  companyName: string;
  gstin: string;
  billingAddress: string;
}

export interface TruckOwnerProfile {
  companyName: string;
  gstin: string;
  fleetCount: number;
}

export interface GodownOwnerProfile {
  companyName: string;
  gstin: string;
  godownCount: number;
}

export interface Vehicle {
  id: string;
  ownerId: string;
  vehicleNumber: string;
  chassisNumber: string;
  engineNumber: string;
  vehicleType: string;
  capacityKg: number;
  volumeCubicCm: number;
  rcStatus: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  fitnessValidUntil: string;
  insuranceValidUntil: string;
  taxValidUntil: string;
  vahanVerified: boolean;
  fastagStatus: 'ACTIVE' | 'INACTIVE' | 'LOW_BALANCE';
  fastagBalance: number;
  pendingChallansCount: number;
  lastTollPlaza?: string;
  lastTollTime?: string;
  currentLat?: number;
  currentLng?: number;
  currentLocationName?: string;
  speedKmh?: number;
  status?: 'IDLE' | 'MOVING' | 'IN_TRANSIT' | 'LOADING' | 'MAINTENANCE';
}

export interface Driver {
  id: string;
  ownerId: string;
  name: string;
  phone: string;
  dlNumber: string;
  dob: string;
  dlStatus: 'Active' | 'Inactive';
  hasTransportEndorsement: boolean;
  sarathiVerified: boolean;
  consentTimestamp: string;
  whatsappOptIn?: boolean;
  whatsappOptInAt?: string;
  whatsappOptInSource?: string;
  conversationState?: string;
  currentTripId?: string;
  lastInboundAt?: string;
}

export interface Godown {
  id: string;
  ownerId: string;
  name: string;
  location: string;
  address: string;
  dimensions?: string; // e.g., 100x60x20 meters
  latitude: number;
  longitude: number;
  totalCapacityKg: number;
  availableCapacityKg: number;
  storageTypes: string[]; // e.g., Dry, Cold, Hazmat
  handlingTimeHours: number;
}

export interface Delivery {
  id: string;
  customerId: string;
  goodsDescription: string;
  goodsCategory: string;
  goodsWeightKg: number;
  goodsVolumeCubicCm: number;
  goodsValueInr: number;
  pickupDate: string;
  pickupLocation: string;
  destinationLocation: string;
  intermediateGodownId?: string;
  specialInstructions?: string;
  urgencyLevel: UrgencyLevel;
  ewayBillNo?: string;
  consignorGstin: string;
  consigneeGstin: string;
  status: DeliveryStatus;
  createdAt: string;
  assignedVehicleId?: string;
  assignedDriverId?: string;
}

export interface Assignment {
  id: string;
  deliveryId: string;
  vehicleId?: string;
  driverId?: string;
  godownId?: string;
  aiRecommended: boolean;
  overrideReason?: string;
  assignedAt: string;
}

export interface Payment {
  id: string;
  deliveryId: string;
  baseFreight: number;
  distanceKm: number;
  tollSurcharge: number;
  gstRate: number; // percentage, e.g. 18
  tdsRate: number; // percentage, e.g. 2
  totalAmount: number;
  status: 'PENDING' | 'CAPTURED' | 'FAILED';
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  paidAt?: string;
}

export interface Invoice {
  id: string;
  deliveryId: string;
  paymentId: string;
  invoiceNo: string;
  amount: number;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  ipPlaceholder: string;
  timestamp: string;
}

export interface FastagWaypoint {
  id: string;
  vehicleNumber: string;
  tollPlazaName: string;
  tollPlazaGeocode: string;
  readerReadTime: string;
  laneDirection: string;
  seqNo: string;
}

export interface ComplianceCheck {
  id: string;
  targetId: string; // vehicleId or driverId or deliveryId
  targetType: 'VEHICLE' | 'DRIVER' | 'DELIVERY';
  passed: boolean;
  rulesChecked: {
    ruleName: string;
    passed: boolean;
    remarks: string;
  }[];
  timestamp: string;
}

export interface AiRecommendation {
  id: string;
  deliveryId: string;
  rankedTrucks: { vehicleId: string; score: number; explanation: string }[];
  rankedGodowns: { godownId: string; score: number; explanation: string }[];
  forecast3Day: number;
  forecast7Day: number;
  timestamp: string;
}
