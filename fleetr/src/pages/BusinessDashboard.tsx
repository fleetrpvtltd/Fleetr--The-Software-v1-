import { useState } from 'react';

export default function BusinessDashboard() {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CREATE' | 'TRACKING'>('OVERVIEW');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex border-b border-gray-200">
        {['OVERVIEW', 'CREATE', 'TRACKING'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        {activeTab === 'OVERVIEW' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg"><p className="text-blue-600 text-sm">Active Orders</p><p className="text-2xl font-bold">12</p></div>
              <div className="p-4 bg-green-50 rounded-lg"><p className="text-green-600 text-sm">Completed Today</p><p className="text-2xl font-bold">5</p></div>
              <div className="p-4 bg-purple-50 rounded-lg"><p className="text-purple-600 text-sm">Total Spend</p><p className="text-2xl font-bold">₹45,200</p></div>
            </div>
          </div>
        )}
        {activeTab === 'CREATE' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Create New Delivery</h2>
            <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
              Volumetric Calculator & Map Integration (Coming in Phase 5)
            </div>
          </div>
        )}
        {activeTab === 'TRACKING' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Active Shipments</h2>
            <div className="text-gray-500 text-center py-8">No active shipments to track.</div>
          </div>
        )}
      </div>
    </div>
  );
}
