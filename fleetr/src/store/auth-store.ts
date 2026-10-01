import { create } from 'zustand';
import { auth } from '@/lib/firebase';
import { User } from '@/types';
import { authApi } from '@/services/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  syncUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: async () => {
    await auth.signOut();
    set({ user: null, isAuthenticated: false });
  },
  syncUser: async () => {
    try {
      const res = await authApi.syncUser();
      set({ user: res.data.user, isAuthenticated: true });
    } catch (e) {
      console.error('Failed to sync user', e);
    }
  }
}));

auth.onAuthStateChanged(async (firebaseUser) => {
  if (firebaseUser) {
    try {
      const res = await authApi.getMe();
      useAuthStore.getState().setUser(res.data.user);
    } catch (e) {
      useAuthStore.getState().setUser(null);
    }
  } else {
    useAuthStore.getState().setUser(null);
  }
  useAuthStore.getState().setLoading(false);
});
