import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { adminApi } from './services/api';
import { useAuthStore } from './store/auth-store';
import { useAppStore } from './store/app-store';
import { MaintenanceMode } from './components/MaintenanceMode';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { Header } from './components/Header';
import { useSocket } from './hooks/useSocket';

const App: React.FC = () => {
  const { user, setUser, loading, setLoading } = useAuthStore();
  const maintenanceMode = useAppStore((state) => state.maintenanceMode);
  const setMaintenanceMode = useAppStore((state) => state.setMaintenanceMode);
  
  const [dbUpdateTrigger, setDbUpdateTrigger] = useState(0);
  
  useSocket(() => {
    setDbUpdateTrigger(prev => prev + 1);
  });

  useEffect(() => {
    const handleMaintenanceMode = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setMaintenanceMode(customEvent.detail);
    };

    window.addEventListener('maintenance-mode', handleMaintenanceMode);
    return () => window.removeEventListener('maintenance-mode', handleMaintenanceMode);
  }, [setMaintenanceMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const response = await adminApi.getUserById(firebaseUser.uid);
          if (response && (response as any).role === 'ADMIN') {
            setUser(response as any);
          } else {
            await auth.signOut();
            setUser(null);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          await auth.signOut();
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }

  return (
    <>
      {maintenanceMode && <MaintenanceMode />}
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        {user && <Header />}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/login" element={!user ? <AdminLoginPage /> : <Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={user ? <AdminDashboard dbUpdateTrigger={dbUpdateTrigger} /> : <Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
          </Routes>
        </main>
      </div>
    </>
  );
};

export default App;
