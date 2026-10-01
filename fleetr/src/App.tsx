import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { UserRole } from '@/types';
import Header from '@/components/Header';
import MaintenanceMode from '@/components/MaintenanceMode';
import AuthPage from '@/pages/AuthPage';
import BusinessDashboard from '@/pages/BusinessDashboard';
import VehicleOwnerDashboard from '@/pages/VehicleOwnerDashboard';
import WarehouseDashboard from '@/pages/WarehouseDashboard';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: UserRole[] }) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};

export default function App() {
  const { isMaintenanceMode } = useAppStore();
  const { user, isAuthenticated } = useAuthStore();

  if (isMaintenanceMode) {
    return <MaintenanceMode />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {isAuthenticated && <Header />}
      <main className="flex-1">
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to={`/dashboard/${user?.role.toLowerCase()}`} replace /> : <AuthPage />} />
          
          <Route path="/dashboard/business_owner" element={
            <ProtectedRoute allowedRoles={[UserRole.BUSINESS_OWNER]}>
              <BusinessDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/dashboard/vehicle_owner" element={
            <ProtectedRoute allowedRoles={[UserRole.VEHICLE_OWNER]}>
              <VehicleOwnerDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/dashboard/warehouse_owner" element={
            <ProtectedRoute allowedRoles={[UserRole.WAREHOUSE_OWNER]}>
              <WarehouseDashboard />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </div>
  );
}
