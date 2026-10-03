/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { Godown, Delivery } from '../types';
import {
  Warehouse,
  PlusCircle,
  TrendingUp,
  RotateCcw,
  CheckCircle,
  Inbox,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  LayoutGrid,
  AlertTriangle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ListCardSkeleton, ChartSkeleton, GridCardSkeleton } from '../components/Skeleton';

export const GodownDashboard: React.FC = () => {
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [routedDeliveries, setRoutedDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states - Godown registration
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [totalCapacityKg, setTotalCapacityKg] = useState('');
  const [dryCbox, setDryCbox] = useState(true);
  const [coldCbox, setColdCbox] = useState(false);
  const [hazmatCbox, setHazmatCbox] = useState(false);
  const [handlingTimeHours, setHandlingTimeHours] = useState('2');

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState<'GDN_ROSTER' | 'STORAGE_TASKS'>('GDN_ROSTER');

  const fetchData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const gdnData = await apiRequest('/godowns');
      setGodowns(gdnData.godowns || []);

      const assignData = await apiRequest('/deliveries?limit=50');
      // filter only routed deliveries where intermediateGodownId matches my registered godown ids
      const myGdnIds = (gdnData.godowns || []).map((g: Godown) => g.id);
      const myRouted = (assignData.deliveries || []).filter((d: Delivery) => d.intermediateGodownId && myGdnIds.includes(d.intermediateGodownId));
      setRoutedDeliveries(myRouted);
    } catch (err) {
      console.error(err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    // Silent real-time synchronization polling every 10 seconds
    const timer = setInterval(() => {
      fetchData(false);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleRegisterGodown = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');

    const capNum = Number(totalCapacityKg);
    if (!capNum || capNum <= 0) {
      setError('Total structural capacity must be a positive decimal.');
      return;
    }

    const types: string[] = [];
    if (dryCbox) types.push('Textiles', 'Garments', 'General Goods');
    if (coldCbox) types.push('Cold Storage', 'Consumables');
    if (hazmatCbox) types.push('Chemicals/Hazmat', 'Electrical Hardware');

    try {
      const resp = await apiRequest('/godowns', 'POST', {
        name,
        location,
        address,
        dimensions: dimensions || '100x60x20 meters',
        totalCapacityKg: capNum,
        storageTypes: types,
        handlingTimeHours: Number(handlingTimeHours)
      });
      if (resp.success) {
        setSuccess(`Godown spatial hub ${name} registered successfully! Available capacity indexed.`);
        setName('');
        setLocation('');
        setAddress('');
        setDimensions('');
        setTotalCapacityKg('');
        fetchData();
      }
    } catch (err: any) {
      setError(err.message || 'Godown setup failed');
    }
  };

  const handleCapacityUpdate = async (id: string, _currentTotal: number) => {
    try {
      const res = await apiRequest(`/godowns/${id}/recalculate-capacity`, 'POST');
      if (res.success) {
        setSuccess(`Recalculated actual inventory: ${res.occupiedKg} kg occupied by ${res.activeCargoCount} active consignments. Available capacity updated.`);
        fetchData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sync actual capacity');
    }
  };

  const handleConfirmStorageTask = async (deliveryId: string, currentStatus: string) => {
    let nextStatus = 'AT_GODOWN';
    if (currentStatus === 'AT_GODOWN') nextStatus = 'IN_TRANSIT'; // departed outbound

    try {
      await apiRequest(`/deliveries/${deliveryId}/status`, 'PATCH', { status: nextStatus });
      setSuccess(`Warehoused cargo shipment progressed milestone tracking to: ${nextStatus}`);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Recharts Capacity Utilization Rate calculations map
  const chartData = godowns.map((g) => {
    const used = g.totalCapacityKg - g.availableCapacityKg;
    return {
      name: g.name.substring(0, 15) + '...',
      'Used Space (KG)': used,
      'Available Space (KG)': g.availableCapacityKg
    };
  });

  return (
    <div className="p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Segmented Navigation tabs */}
      <div className="bg-slate-100 p-1.5 rounded-xl flex gap-1.5 self-start border border-slate-200 overflow-x-auto no-scrollbar max-w-full">
        <button
          onClick={() => setActiveTab('GDN_ROSTER')}
          className={`px-3.5 sm:px-4 py-2 min-h-[40px] text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap inline-flex items-center justify-center ${activeTab === 'GDN_ROSTER' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Godowns & Utilizations
        </button>
        <button
          onClick={() => setActiveTab('STORAGE_TASKS')}
          className={`px-3.5 sm:px-4 py-2 min-h-[40px] text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap inline-flex items-center justify-center ${activeTab === 'STORAGE_TASKS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Consignment Tasks ({routedDeliveries.length})
        </button>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-3">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span className="text-xs font-mono font-semibold">{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-250 text-rose-800 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-3">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <span className="text-xs font-mono font-semibold">{error}</span>
        </div>
      )}

      {/* GODOWN ROSTER TAB */}
      {activeTab === 'GDN_ROSTER' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          <div className="space-y-6 lg:col-span-2">
            {loading ? (
              <>
                <ListCardSkeleton count={3} showProgress title="My Godown Structures" />
                <ChartSkeleton title="Capacity Utilization Profile" height="h-56" />
              </>
            ) : (
              <>
                {/* Active Godowns list */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-display">My Godown Structures</h3>
                <span className="text-xs font-mono font-bold bg-slate-200 px-2 py-0.5 rounded text-slate-700">{godowns.length} Active</span>
              </div>
              <div className="divide-y divide-slate-100">
                {godowns.length === 0 ? (
                  <p className="p-6 text-slate-400 text-center text-xs">No registered warehouses found. Register your structure to get routed AI assignments.</p>
                ) : (
                  godowns.map((g) => {
                    const occupancy = ((g.totalCapacityKg - g.availableCapacityKg) / g.totalCapacityKg) * 100;
                    return (
                      <div key={g.id} className="p-4 space-y-3 hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-slate-900 text-white p-2 rounded-lg">
                              <Warehouse className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">{g.name}</span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">{g.address} | Dimensions: <b className="font-mono text-indigo-700">{g.dimensions || '100m x 60m x 20m'}</b> | Handling Time: {g.handlingTimeHours} hrs</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleCapacityUpdate(g.id, g.totalCapacityKg)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3.5 py-2 min-h-[38px] rounded-lg text-xs uppercase tracking-wide transition-all active:scale-95 cursor-pointer inline-flex items-center justify-center shrink-0"
                          >
                            Audit Stored Inventory
                          </button>
                        </div>
                        {/* Occupancy Progress Bar */}
                        <div className="space-y-1.5 text-[10px]">
                          <div className="flex justify-between font-mono font-bold text-slate-600">
                            <span>Dynamic Staging Occupancy Rate:</span>
                            <span className={occupancy > 85 ? 'text-rose-600' : 'text-slate-800'}>{Math.round(occupancy)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div style={{ width: `${occupancy}%` }} className={`h-full rounded-full transition-all ${occupancy > 85 ? 'bg-rose-500' : 'bg-slate-900'}`} />
                          </div>
                          <div className="flex justify-between font-mono text-[9px] text-slate-400">
                            <span>Available: {Math.round(g.availableCapacityKg / 1000)} Tons</span>
                            <span>Total Capacity: {Math.round(g.totalCapacityKg / 1000)} Tons</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Warehouse capacity chart */}
            {godowns.length > 0 && (
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-display">Capacity Utilization Profile</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                      <YAxis stroke="#94a3b8" fontSize={9} />
                      <Tooltip />
                      <Bar dataKey="Used Space (KG)" stackId="a" fill="#0f172a" />
                      <Bar dataKey="Available Space (KG)" stackId="a" fill="#38bdf8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
              </>
            )}
          </div>

          {/* Godown enlisting form */}
          <div>
            <form onSubmit={handleRegisterGodown} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-display">Enlist Godown site</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Godown/Facility Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Mistry Sarkhej Hub A"
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">General Location *</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Sarkhej, Ahmedabad, Gujarat"
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Physical Address *</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Physical plot details address"
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Total Capacity payload (KG) *</label>
                  <input
                    type="number"
                    required
                    value={totalCapacityKg}
                    onChange={(e) => setTotalCapacityKg(e.target.value)}
                    placeholder="e.g. 200000"
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Godown Dimensions (L x W x H) *</label>
                  <input
                    type="text"
                    required
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                    placeholder="e.g. 120m x 80m x 22m"
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Handling Time (Hours) *</label>
                  <input
                    type="number"
                    required
                    value={handlingTimeHours}
                    onChange={(e) => setHandlingTimeHours(e.target.value)}
                    placeholder="e.g. 2"
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Structural Configurations</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={dryCbox} onChange={(e) => setDryCbox(e.target.checked)} className="accent-slate-900" />
                      <span>Dry Space</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={coldCbox} onChange={(e) => setColdCbox(e.target.checked)} className="accent-slate-900" />
                      <span>Cold Room</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={hazmatCbox} onChange={(e) => setHazmatCbox(e.target.checked)} className="accent-slate-900" />
                      <span>Hazmat Vault</span>
                    </label>
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 min-h-[44px] rounded-lg text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer inline-flex items-center justify-center shadow-xs">
                Enlist warehouse site
              </button>
            </form>
          </div>
        </div>
      )}

      {/* STORAGE TASKS TAB */}
      {activeTab === 'STORAGE_TASKS' && (
        loading ? (
          <GridCardSkeleton count={4} title="Assigned Storage Tasks" />
        ) : (
        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-300">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-display">Assigned Storage Tasks</h3>
          </div>

          {routedDeliveries.length === 0 ? (
            <p className="text-center py-12 text-slate-400 text-xs">No active deliveries are scheduled via your warehouses currently.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {routedDeliveries.map((del) => {
                const isInboundPending = del.status === 'IN_TRANSIT';
                const isResident = del.status === 'AT_GODOWN';

                return (
                  <div key={del.id} className="border border-slate-200 rounded-xl p-4 space-y-3 hover:border-slate-300 transition-all shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 font-bold block">WAYPOINT: {del.id}</span>
                        <h4 className="text-xs font-bold text-slate-805 mt-0.5">{del.goodsDescription}</h4>
                      </div>
                      <span className="font-mono text-[9px] font-extrabold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border">
                        {del.status}
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-2.5 text-[10px] space-y-1 text-slate-600 font-medium">
                      <div className="flex justify-between">
                        <span>Required Configurations:</span>
                        <span className="font-bold text-slate-800">{del.goodsCategory}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Payload Size Weight:</span>
                        <span className="font-bold text-slate-800">{del.goodsWeightKg} kg</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[9px] text-slate-400 font-mono">Operations Audit Settle OK</span>
                      {isInboundPending && (
                        <button
                          onClick={() => handleConfirmStorageTask(del.id, del.status)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 min-h-[40px] rounded-lg text-xs uppercase transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-xs inline-flex items-center justify-center"
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5" /> Confirm Inbound
                        </button>
                      )}
                      {isResident && (
                        <button
                          onClick={() => handleConfirmStorageTask(del.id, del.status)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 min-h-[40px] rounded-lg text-xs uppercase transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-xs inline-flex items-center justify-center"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" /> Depart Outbound
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )
      )}
    </div>
  );
};
