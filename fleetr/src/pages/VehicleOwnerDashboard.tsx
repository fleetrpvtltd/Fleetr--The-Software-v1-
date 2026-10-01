import { useState, useEffect } from 'react';
import ConsentModal from '@/components/ConsentModal';
import { useConsent } from '@/hooks/useConsent';

export default function VehicleOwnerDashboard() {
  const [activeTab, setActiveTab] = useState<'FLEET' | 'COMPLIANCE' | 'ASSIGNMENTS'>('FLEET');
  const { checkConsent, grantConsent, consents } = useConsent();
  const [showConsentModal, setShowConsentModal] = useState(false);

  useEffect(() => {
    if (Object.keys(consents).length > 0 && !checkConsent('vahan')) {
      setShowConsentModal(true);
    }
  }, [consents]);

  const handleAgreeConsent = async (agreedConsents: string[]) => {
    for (const c of agreedConsents) {
      await grantConsent(c);
    }
    setShowConsentModal(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {showConsentModal && (
        <ConsentModal onAgree={handleAgreeConsent} onCancel={() => setShowConsentModal(false)} />
      )}
      
      <div className="flex border-b border-gray-200">
        {['FLEET', 'COMPLIANCE', 'ASSIGNMENTS'].map(tab => (
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
        {activeTab === 'FLEET' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Fleet Management</h2>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Add Vehicle</button>
          </div>
        )}
        {activeTab === 'COMPLIANCE' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Compliance Status</h2>
            <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg">Check missing documents and upcoming renewals.</div>
          </div>
        )}
        {activeTab === 'ASSIGNMENTS' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Active Assignments</h2>
            <div className="text-gray-500 text-center py-8">No current trips assigned to your fleet.</div>
          </div>
        )}
      </div>
    </div>
  );
}
