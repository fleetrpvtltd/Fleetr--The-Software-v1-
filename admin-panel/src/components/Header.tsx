import React from 'react';
import { useAuthStore } from '../store/auth-store';
import { useAppStore } from '../store/app-store';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { LogOut } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const socketConnected = useAppStore((state) => state.socketConnected);

  const handleLogout = async () => {
    await signOut(auth);
    logout();
  };

  return (
    <header className="bg-slate-900 text-white h-16 px-6 flex items-center justify-between sticky top-0 z-30 shadow-md">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold font-display tracking-wider">FLEETR <span className="text-indigo-400">ADMIN</span></h1>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${socketConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="text-xs font-mono text-slate-300">
            {socketConnected ? 'SYSTEM CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>

        {user && (
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-100">{user.name}</p>
              <p className="text-xs font-mono text-slate-400">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 bg-slate-800 hover:bg-rose-600 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
