import React from 'react';

export const MaintenanceMode: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-xl max-w-md w-full text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">System Maintenance</h2>
        <p className="text-slate-600">The platform is currently undergoing scheduled maintenance. Please check back later.</p>
      </div>
    </div>
  );
};
