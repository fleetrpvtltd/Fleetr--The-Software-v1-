import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { StateFilter } from '../components/StateFilter';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Warehouse, Truck, Users, Activity, FileText, AlertTriangle, UserCheck } from 'lucide-react';

interface Props {
  dbUpdateTrigger: number;
}

export const AdminDashboard: React.FC<Props> = ({ dbUpdateTrigger }) => {
  const [activeTab, setActiveTab] = useState('WAREHOUSE');
  const [selectedState, setSelectedState] = useState('');
  
  // States
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [transporters, setTransporters] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [warehouseCapacity, setWarehouseCapacity] = useState<any>(null);
  
  const [selectedTransporterId, setSelectedTransporterId] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientDetails, setClientDetails] = useState<any>(null);
  
  const [quotePipeline, setQuotePipeline] = useState<any>(null);
  const [orderPipeline, setOrderPipeline] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  
  // Existing data
  const [deliveries, setDeliveries] = useState<any[]>([]);
  
  const fetchData = async () => {
    try {
      if (activeTab === 'WAREHOUSE') {
        const res: any = await adminApi.getWarehousesByState(selectedState);
        setWarehouses(res || []);
      } else if (activeTab === 'FLEET') {
        const res: any = await adminApi.getTransportersByState(selectedState);
        setTransporters(res || []);
      } else if (activeTab === 'CLIENT') {
        const res: any = await adminApi.getClientsByState(selectedState);
        setClients(res || []);
        const qRes: any = await adminApi.getQuotePipeline();
        setQuotePipeline(qRes || null);
      } else if (activeTab === 'ORDER_PIPELINE') {
        const res: any = await adminApi.getOrderPipeline();
        setOrderPipeline(res || null);
        const delRes: any = await adminApi.getAllOrders();
        setDeliveries(delRes || []);
      } else if (activeTab === 'AUDIT') {
        const res: any = await adminApi.getAuditLogs();
        setAuditLogs(res || []);
      }
    } catch (e) {
      console.error("Failed to fetch data", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, selectedState, dbUpdateTrigger]);

  const loadWarehouseCapacity = async (id: string) => {
    setSelectedWarehouseId(id);
    try {
      const res: any = await adminApi.getWarehouseCapacity(id);
      setWarehouseCapacity(res);
    } catch (e) {
      console.error(e);
    }
  };

  const loadTransporterDetails = async (id: string) => {
    setSelectedTransporterId(id);
    try {
      const vRes: any = await adminApi.getVehiclesByTransporter(id);
      setVehicles(vRes || []);
      const dRes: any = await adminApi.getDriversByTransporter(id);
      setDrivers(dRes || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadClientDetails = async (id: string) => {
    setSelectedClientId(id);
    try {
      const res: any = await adminApi.getClientDetails(id);
      setClientDetails(res);
    } catch (e) {
      console.error(e);
    }
  };

  const COLORS = ['#4f46e5', '#e2e8f0'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-2 rounded-xl flex gap-2 overflow-x-auto border border-slate-200">
        <button onClick={() => setActiveTab('WAREHOUSE')} className={`px-4 py-2 text-xs font-bold uppercase rounded-lg whitespace-nowrap ${activeTab === 'WAREHOUSE' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Warehouse Ops</button>
        <button onClick={() => setActiveTab('FLEET')} className={`px-4 py-2 text-xs font-bold uppercase rounded-lg whitespace-nowrap ${activeTab === 'FLEET' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Fleet Ops</button>
        <button onClick={() => setActiveTab('CLIENT')} className={`px-4 py-2 text-xs font-bold uppercase rounded-lg whitespace-nowrap ${activeTab === 'CLIENT' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Client Ops</button>
        <button onClick={() => setActiveTab('ORDER_PIPELINE')} className={`px-4 py-2 text-xs font-bold uppercase rounded-lg whitespace-nowrap ${activeTab === 'ORDER_PIPELINE' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Order Pipeline</button>
        <button onClick={() => setActiveTab('AUDIT')} className={`px-4 py-2 text-xs font-bold uppercase rounded-lg whitespace-nowrap ${activeTab === 'AUDIT' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Audit Log</button>
      </div>

      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
        <h2 className="text-lg font-bold font-display">{activeTab.replace('_', ' ')} OVERVIEW</h2>
        {(activeTab === 'WAREHOUSE' || activeTab === 'FLEET' || activeTab === 'CLIENT') && (
          <StateFilter value={selectedState} onChange={setSelectedState} />
        )}
      </div>

      {activeTab === 'WAREHOUSE' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Warehouse className="w-4 h-4"/> WAREHOUSES</h3>
            <div className="space-y-2">
              {warehouses.map(w => (
                <div key={w.id} onClick={() => loadWarehouseCapacity(w.id)} className={`p-3 border rounded-lg cursor-pointer ${selectedWarehouseId === w.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:bg-slate-50'}`}>
                  <p className="font-bold text-sm">{w.name}</p>
                  <p className="text-xs text-slate-500">{w.district}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-4">
            {warehouseCapacity ? (
              <div>
                <h3 className="text-sm font-bold mb-4">CAPACITY METRICS</h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 font-bold uppercase">Space Allotted</p>
                    <p className="text-xl font-bold">{warehouseCapacity.space} {warehouseCapacity.unit}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 font-bold uppercase">Rate</p>
                    <p className="text-xl font-bold">₹{warehouseCapacity.rate}/{warehouseCapacity.unit}</p>
                  </div>
                </div>
                
                <div className="h-64 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Used', value: warehouseCapacity.used },
                          { name: 'Available', value: warehouseCapacity.available }
                        ]}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill={COLORS[0]} />
                        <Cell fill={COLORS[1]} />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold">{Math.round((warehouseCapacity.used / (warehouseCapacity.used + warehouseCapacity.available)) * 100)}% Occupied</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Select a warehouse to view capacity</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'FLEET' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Users className="w-4 h-4"/> TRANSPORTERS</h3>
            <div className="space-y-2">
              {transporters.map(t => (
                <div key={t.id} onClick={() => loadTransporterDetails(t.id)} className={`p-3 border rounded-lg cursor-pointer ${selectedTransporterId === t.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:bg-slate-50'}`}>
                  <p className="font-bold text-sm">{t.name}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Truck className="w-4 h-4"/> VEHICLES</h3>
              {vehicles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {vehicles.map(v => (
                    <div key={v.id} className="p-3 border border-slate-100 rounded-lg">
                      <p className="font-bold">{v.registration}</p>
                      <p className="text-xs text-slate-500">{v.type} • {v.capacity} capacity</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded mt-2 inline-block ${v.compliant ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {v.compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No vehicles or select a transporter</p>
              )}
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><UserCheck className="w-4 h-4"/> DRIVERS</h3>
              {drivers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {drivers.map(d => (
                    <div key={d.id} className="p-3 border border-slate-100 rounded-lg">
                      <p className="font-bold">{d.name}</p>
                      <p className="text-xs text-slate-500">DL: {d.dl}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded mt-2 inline-block bg-slate-100 text-slate-700 uppercase`}>
                        {d.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No drivers or select a transporter</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'CLIENT' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Users className="w-4 h-4"/> CLIENTS</h3>
            <div className="space-y-2">
              {clients.map(c => (
                <div key={c.id} onClick={() => loadClientDetails(c.id)} className={`p-3 border rounded-lg cursor-pointer ${selectedClientId === c.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:bg-slate-50'}`}>
                  <p className="font-bold text-sm">{c.name}</p>
                  <p className="text-xs text-slate-500">GST: {c.gstin}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="md:col-span-2 space-y-6">
            {clientDetails && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><FileText className="w-4 h-4"/> BUSINESS DETAILS</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 font-bold">Products</p>
                    <p className="text-sm font-medium">{clientDetails.products?.join(', ') || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold">Location</p>
                    <p className="text-sm font-medium">{clientDetails.location}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Activity className="w-4 h-4"/> QUOTE PIPELINE</h3>
              {quotePipeline && (
                <div>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                      <p className="text-xs text-slate-500 font-bold">Total</p>
                      <p className="text-xl font-bold">{quotePipeline.total}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                      <p className="text-xs text-slate-500 font-bold">Pending</p>
                      <p className="text-xl font-bold text-amber-600">{quotePipeline.pending}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                      <p className="text-xs text-slate-500 font-bold">Delivered</p>
                      <p className="text-xl font-bold text-emerald-600">{quotePipeline.delivered}</p>
                    </div>
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={quotePipeline.chartData || []}>
                        <XAxis dataKey="name" fontSize={10} />
                        <YAxis fontSize={10} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ORDER_PIPELINE' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
           <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Activity className="w-4 h-4"/> ORDERS</h3>
           <div className="overflow-x-auto">
             <table className="w-full text-xs text-left">
                <thead className="bg-[#f8fafc] text-[#64748b] uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Order ID</th>
                    <th className="px-4 py-3">Details</th>
                    <th className="px-4 py-3">Locations Route</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {deliveries.map((del) => (
                    <tr key={del.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-bold">{del.id}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold block text-slate-850">{del.description}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-700">{del.pickup}</span> ➔ <span className="font-bold text-slate-750">{del.destination}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-mono text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-250">
                          {del.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
           </div>
        </div>
      )}

      {activeTab === 'AUDIT' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> AUDIT LOGS</h3>
          <div className="space-y-3">
            {auditLogs.map((log, i) => (
              <div key={i} className="p-3 border border-slate-100 rounded-lg bg-slate-50">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-sm">{log.action}</span>
                  <span className="text-xs text-slate-400">{log.timestamp}</span>
                </div>
                <p className="text-xs text-slate-600">{log.details}</p>
                <p className="text-[10px] text-slate-400 mt-2 font-mono">User: {log.user} | IP: {log.ip}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
