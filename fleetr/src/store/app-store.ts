import { create } from 'zustand';

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface AppState {
  isMaintenanceMode: boolean;
  notifications: Notification[];
  setMaintenanceMode: (status: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  clearNotifications: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isMaintenanceMode: false,
  notifications: [],
  setMaintenanceMode: (status) => set({ isMaintenanceMode: status }),
  addNotification: (notification) => set((state) => ({
    notifications: [...state.notifications, { ...notification, id: Date.now().toString() }]
  })),
  clearNotifications: () => set({ notifications: [] })
}));
