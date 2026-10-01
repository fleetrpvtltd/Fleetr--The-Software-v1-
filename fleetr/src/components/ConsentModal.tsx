import { useState } from 'react';

interface Props {
  onAgree: (consents: string[]) => void;
  onCancel: () => void;
}

export default function ConsentModal({ onAgree, onCancel }: Props) {
  const [vahan, setVahan] = useState(false);
  const [sarathi, setSarathi] = useState(false);
  const [gps, setGps] = useState(false);

  const canAgree = vahan && sarathi && gps;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Data Privacy Consent (DPDP Act)</h2>
        <p className="text-sm text-gray-600 mb-6">To provide our services, we require access to the following information. Please grant consent below.</p>
        
        <div className="space-y-4 mb-8">
          <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" checked={vahan} onChange={(e) => setVahan(e.target.checked)} className="mt-1" />
            <div>
              <div className="font-semibold">VAHAN Vehicle Lookup</div>
              <div className="text-xs text-gray-500">Allow us to fetch RC and vehicle fitness details.</div>
            </div>
          </label>
          
          <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" checked={sarathi} onChange={(e) => setSarathi(e.target.checked)} className="mt-1" />
            <div>
              <div className="font-semibold">SARATHI Driver Verification</div>
              <div className="text-xs text-gray-500">Allow us to verify driver's license status.</div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" checked={gps} onChange={(e) => setGps(e.target.checked)} className="mt-1" />
            <div>
              <div className="font-semibold">GPS Tracking</div>
              <div className="text-xs text-gray-500">Allow tracking during active assignments.</div>
            </div>
          </label>
        </div>

        <div className="flex gap-4">
          <button onClick={onCancel} className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button 
            onClick={() => onAgree(['vahan', 'sarathi', 'gps'])} 
            disabled={!canAgree}
            className={`flex-1 py-2 px-4 rounded-lg text-white ${canAgree ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
          >
            I Agree
          </button>
        </div>
      </div>
    </div>
  );
}
