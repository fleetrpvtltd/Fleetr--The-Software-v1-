import { create } from 'zustand';

interface AppState {
  maintenanceMode: boolean;
  socketConnected: boolean;
  setMaintenanceMode: (status: boolean) => void;
  setSocketConnected: (status: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  maintenanceMode: false,
  socketConnected: false,
  setMaintenanceMode: (status) => set({ maintenanceMode: status }),
  setSocketConnected: (status) => set({ socketConnected: status }),
}));
