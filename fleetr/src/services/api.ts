import axios from 'axios';
import { auth } from '@/lib/firebase';
import { useAppStore } from '@/store/app-store';

export const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 503) {
      useAppStore.getState().setMaintenanceMode(true);
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  syncUser: () => api.post('/auth/sync'),
  getMe: () => api.get('/auth/me')
};

export const fleetApi = {
  getVehicles: () => api.get('/fleet/vehicles'),
  addVehicle: (data: any) => api.post('/fleet/vehicles', data),
  getDrivers: () => api.get('/fleet/drivers'),
  addDriver: (data: any) => api.post('/fleet/drivers', data)
};

export const ordersApi = {
  createDelivery: (data: any) => api.post('/orders', data),
  getDeliveries: () => api.get('/orders'),
  updateDeliveryStatus: (id: string, status: string) => api.patch(`/orders/${id}/status`, { status })
};

export const paymentsApi = {
  createPayment: (data: any) => api.post('/payments/create', data),
  mockPaymentSuccess: (paymentId: string) => api.post(`/payments/${paymentId}/success`)
};

export const consentApi = {
  grantConsent: (purpose: string) => api.post('/consent/grant', { purpose }),
  withdrawConsent: (purpose: string) => api.post('/consent/withdraw', { purpose }),
  getConsentStatus: () => api.get('/consent/status')
};

export const complianceApi = {
  checkOverloading: (vehicleId: string) => api.get(`/compliance/overloading/${vehicleId}`),
  calculateTDS: (amount: number) => api.post('/compliance/tds', { amount })
};
