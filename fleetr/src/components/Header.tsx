import { useAuthStore } from '@/store/auth-store';
import { useSocket } from '@/hooks/useSocket';
import { LogOut, Activity } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuthStore();
  const { isConnected } = useSocket();

  return (
    <header className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-blue-700">Fleetr</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Activity className={`w-4 h-4 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
          {isConnected ? 'Live' : 'Disconnected'}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">{user?.name} ({user?.role})</span>
        <button onClick={logout} className="p-2 text-gray-600 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
