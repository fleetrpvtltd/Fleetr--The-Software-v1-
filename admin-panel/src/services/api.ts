import axios from 'axios';
import { auth } from '../lib/firebase';

const api = axios.create({
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
  (response) => response.data,
  (error) => {
    if (error.response?.status === 503) {
      window.dispatchEvent(new CustomEvent('maintenance-mode', { detail: true }));
    }
    return Promise.reject(error);
  }
);

export const adminApi = {
  getWarehousesByState: (state: string) => api.get(`/admin/warehouses?state=${state}`),
  getWarehouseCapacity: (id: string) => api.get(`/admin/warehouses/${id}/capacity`),
  getTransportersByState: (state: string) => api.get(`/admin/transporters?state=${state}`),
  getVehiclesByTransporter: (id: string) => api.get(`/admin/transporters/${id}/vehicles`),
  getDriversByTransporter: (id: string) => api.get(`/admin/transporters/${id}/drivers`),
  getClientsByState: (state: string) => api.get(`/admin/clients?state=${state}`),
  getClientDetails: (id: string) => api.get(`/admin/clients/${id}`),
  getQuotePipeline: () => api.get(`/admin/quotes/pipeline`),
  getAllOrders: () => api.get(`/admin/orders`),
  getOrderPipeline: () => api.get(`/admin/orders/pipeline`),
  getAuditLogs: () => api.get(`/admin/audit-logs`),
  getBreachLogs: () => api.get(`/admin/breach-logs`),
  getUsers: () => api.get(`/admin/users`),
  getUserById: (id: string) => api.get(`/admin/users/${id}`),
};

export default api;
