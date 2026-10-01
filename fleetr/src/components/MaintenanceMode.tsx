import { AlertTriangle } from 'lucide-react';

export default function MaintenanceMode() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-yellow-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Maintenance Mode</h1>
        <p className="text-gray-600">Service temporarily unavailable. We're working to restore access. Please try again later.</p>
      </div>
    </div>
  );
}
