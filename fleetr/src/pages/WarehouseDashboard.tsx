import { useState } from 'react';

export default function WarehouseDashboard() {
  const [activeTab, setActiveTab] = useState<'ROSTER' | 'STORAGE_TASKS'>('ROSTER');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex border-b border-gray-200">
        {['ROSTER', 'STORAGE_TASKS'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        {activeTab === 'ROSTER' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Vehicle Roster</h2>
            <div className="text-gray-500 text-center py-8">No incoming vehicles currently expected.</div>
          </div>
        )}
        {activeTab === 'STORAGE_TASKS' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Storage Tasks</h2>
            <div className="text-gray-500 text-center py-8">All tasks completed.</div>
          </div>
        )}
      </div>
    </div>
  );
}
