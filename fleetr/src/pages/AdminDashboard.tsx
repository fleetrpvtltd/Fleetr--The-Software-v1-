/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import {
  Delivery,
  Vehicle,
  Driver,
  Godown,
  Payment,
  User,
  AuditLog
} from '../types';
import type { AnomalyAlert, RankedTruck, RankedGodown } from '../backend/aiServices';
import { MetricCardsSkeleton, TableSkeleton, ListCardSkeleton } from '../components/Skeleton';
import {
  ShieldAlert,
  Users,
  Briefcase,
  Layers,
  Search,
  Filter,
  CheckCircle,
  AlertOctagon,
  FileCheck,
  XSquare,
  Sparkles,
  TrendingDown,
  ChevronRight,
  Database,
  RefreshCcw,
  Warehouse,
  AlertTriangle,
  Compass,
  Trash2,
  Ban,
  UserCheck
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Active workstation state
  const [activeWorkstation, setActiveWorkstation] = useState<'MAIN' | 'PIPELINE' | 'WORKSPACE' | 'COMPLIANCE' | 'AUDIT' | 'USERS' | 'TRACKING'>('MAIN');

  // Workstation selection target variables
  const [selectedDelId, setSelectedDelId] = useState<string>('');
  const [aiTrucks, setAiTrucks] = useState<any[]>([]);
  const [aiGodowns, setAiGodowns] = useState<any[]>([]);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideVehicleId, setOverrideVehicleId] = useState('');
  const [overrideGodownId, setOverrideGodownId] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [delCursor, setDelCursor] = useState<string | null>(null);
  const [hasMoreDel, setHasMoreDel] = useState(false);
  const [loadingMoreDel, setLoadingMoreDel] = useState(false);

  const fetchData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const delData = await apiRequest('/deliveries?limit=15');
      setDeliveries(delData.deliveries || []);
      setDelCursor(delData.nextCursor || null);
      setHasMoreDel(Boolean(delData.hasMore));

      const vehData = await apiRequest('/fleet/vehicles?limit=50');
      setVehicles(vehData.vehicles || []);

      const drvData = await apiRequest('/drivers');
      setDrivers(drvData.drivers || []);

      const gdnData = await apiRequest('/godowns');
      setGodowns(gdnData.godowns || []);

      const payData = await apiRequest('/payments');
      setPayments(payData.payments || []);

      const userData = await apiRequest('/users').catch((err) => {
        console.warn('Notice: /users endpoint response:', err);
        return { users: [] };
      });
      setUsersList(userData?.users || []);

      const auditData = await apiRequest('/audit');
      setAuditLogs(auditData.auditLogs || []);

      const anomsData = await apiRequest('/ai/anomalies');
      setAnomalies(anomsData.anomalies || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const handleLoadMoreDeliveries = async () => {
    if (!delCursor || loadingMoreDel) return;
    try {
      setLoadingMoreDel(true);
      const more = await apiRequest(`/deliveries?limit=15&startAfter=${encodeURIComponent(delCursor)}`);
      if (more.deliveries && more.deliveries.length > 0) {
        setDeliveries((prev) => [...prev, ...more.deliveries]);
        setDelCursor(more.nextCursor || null);
        setHasMoreDel(Boolean(more.hasMore));
      } else {
        setHasMoreDel(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMoreDel(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    // Silent real-time background sync every 10 seconds
    const timer = setInterval(() => {
      fetchData(false);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const triggerPaymentRequest = async (deliveryId: string) => {
    try {
      await apiRequest(`/deliveries/${deliveryId}/request-payment`, 'POST');
      setSuccess(`Invoiced billing successfully generated for order: ${deliveryId}`);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleStatusTransition = async (deliveryId: string, status: string) => {
    try {
      await apiRequest(`/deliveries/${deliveryId}/status`, 'PATCH', { status });
      setSuccess(`Shipment status progressed to ${status}`);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Transition blocked');
    }
  };

  // Open FLEETR-MIND AI recommendation query workstation
  const openAIWorkstation = async (delId: string) => {
    setSelectedDelId(delId);
    setOverrideVehicleId('');
    setOverrideGodownId('');
    setOverrideReason('');
    try {
      const recs = await apiRequest(`/assignments/recommendations/${delId}`);
      setAiTrucks(recs.trucks || []);
      setAiGodowns(recs.godowns || []);
      setActiveWorkstation('WORKSPACE');
    } catch (err) {
      console.error(err);
    }
  };

  const executeRecommendation = async (truckId: string, godownId: string) => {
    try {
      await apiRequest(`/assignments/${selectedDelId}/assign-truck`, 'POST', {
        vehicleId: truckId,
        driverId: drivers[0]?.id || 'drv_1'
      });
      if (godownId) {
        await apiRequest(`/assignments/${selectedDelId}/assign-godown`, 'POST', { godownId });
      }
      setSuccess(`Successfully completed smart assignment via FLEETR-MIND logic!`);
      fetchData();
      setActiveWorkstation('MAIN');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const executeOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason) {
      setError('Stating a clear override reason explanation is required for audit logs.');
      return;
    }
    try {
      await apiRequest(`/assignments/${selectedDelId}/override-ai`, 'POST', {
        vehicleId: overrideVehicleId || aiTrucks[0]?.vehicleId,
        driverId: drivers[1]?.id || 'drv_2',
        godownId: overrideGodownId || aiGodowns[0]?.godownId,
        overrideReason
      });
      setSuccess('AI intelligence override approved and logged in central audits.');
      fetchData();
      setActiveWorkstation('MAIN');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const updateUserStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    try {
      setUpdatingUserId(userId);
      setError('');
      // Optimistic update
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: nextStatus as any } : u))
      );
      const resp = await apiRequest(`/users/${userId}/status`, 'PATCH', { status: nextStatus });
      setSuccess(`Account status updated to ${nextStatus}.`);
      if (resp.user) {
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, status: resp.user.status } : u))
        );
      }
      fetchData();
    } catch (err: any) {
      console.error('Update user status error:', err);
      setError(err.message || 'Failed to update user status.');
      // Revert optimistic update
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: currentStatus as any } : u))
      );
    } finally {
      setUpdatingUserId(null);
    }
  };

  const confirmDeleteUserAccount = async (targetUser: User) => {
    try {
      setDeletingUserId(targetUser.id);
      setError('');
      const resp = await apiRequest(`/users/${targetUser.id}`, 'DELETE');
      setSuccess(
        resp.message ||
        `Account for "${targetUser.name}" and all associated database records permanently deleted from database.`
      );
      setUsersList((prev) => prev.filter((u) => u.id !== targetUser.id && u.email !== targetUser.email));
      setUserToDelete(null);
      fetchData();
    } catch (err: any) {
      console.error('Delete user error:', err);
      setError(err.message || 'Failed to delete user account.');
    } finally {
      setDeletingUserId(null);
    }
  };

  // General Totals mapping
  const totalRevenue = payments.filter((p) => p.status === 'CAPTURED').reduce((acc, curr) => acc + curr.totalAmount, 0);
  const pendingAssCount = deliveries.filter((d) => d.status === 'REQUESTED' || d.status === 'ADMIN_REVIEWED').length;

  return (
    <div className="p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Top Segmented Workstation bar menu toggling controls */}
      <div className="bg-slate-100 p-1.5 rounded-xl flex gap-1.5 self-start border border-slate-200 overflow-x-auto no-scrollbar max-w-full">
        <button
          onClick={() => setActiveWorkstation('MAIN')}
          className={`px-3.5 sm:px-4 py-2 min-h-[40px] text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap inline-flex items-center justify-center ${activeWorkstation === 'MAIN' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Console
        </button>
        <button
          onClick={() => setActiveWorkstation('PIPELINE')}
          className={`px-3.5 sm:px-4 py-2 min-h-[40px] text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap inline-flex items-center justify-center ${activeWorkstation === 'PIPELINE' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Pipeline
        </button>
        <button
          onClick={() => setActiveWorkstation('COMPLIANCE')}
          className={`px-3.5 sm:px-4 py-2 min-h-[40px] text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap inline-flex items-center justify-center ${activeWorkstation === 'COMPLIANCE' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Anomalies ({anomalies.length})
        </button>
        <button
          onClick={() => setActiveWorkstation('USERS')}
          className={`px-3.5 sm:px-4 py-2 min-h-[40px] text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap inline-flex items-center justify-center ${activeWorkstation === 'USERS' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveWorkstation('TRACKING')}
          className={`px-3.5 sm:px-4 py-2 min-h-[40px] text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 justify-center ${activeWorkstation === 'TRACKING' ? 'bg-blue-600 text-white shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Real-Time Radar & Routing</span>
        </button>
        <button
          onClick={() => setActiveWorkstation('AUDIT')}
          className={`px-3.5 sm:px-4 py-2 min-h-[40px] text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap inline-flex items-center justify-center ${activeWorkstation === 'AUDIT' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Audit Logs
        </button>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span className="text-xs font-mono font-semibold">{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-250 text-rose-800 p-4 rounded-xl flex items-center gap-3">
          <AlertOctagon className="w-5 h-5 text-rose-600" />
          <span className="text-xs font-mono font-semibold">{error}</span>
        </div>
      )}

      {/* CORE WORKSTATION DASHBOARD */}
      {activeWorkstation === 'MAIN' && (
        loading ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <MetricCardsSkeleton count={5} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ListCardSkeleton count={3} title="Deliveries Pending Truck/Godown Routing" />
              </div>
              <div>
                <ListCardSkeleton count={3} title="Compliance Anomaly Alerts" />
              </div>
            </div>
          </div>
        ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Quick Metrics KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-400 text-xs font-medium block">Active Platform Users</span>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xl font-display font-extrabold text-slate-850">{usersList.length} Accounts</span>
                <Users className="w-5 h-5 text-slate-400" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-400 text-xs font-medium block">Consignments Routed</span>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xl font-display font-extrabold text-slate-800">{deliveries.length} orders</span>
                <Briefcase className="w-5 h-5 text-slate-400" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-400 text-xs font-medium block">Pending Assignments</span>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xl font-display font-extrabold text-indigo-600">{pendingAssCount} Tasks</span>
                <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-400 text-xs font-medium block">Active Compliance Issues</span>
              <div className="flex justify-between items-center mt-2 font-bold">
                <span className={anomalies.length > 0 ? 'text-rose-600 text-xl font-display font-extrabold' : 'text-slate-800 text-xl font-display font-extrabold'}>
                  {anomalies.length} Alarms
                </span>
                <ShieldAlert className={anomalies.length > 0 ? 'w-5 h-5 text-rose-500' : 'w-5 h-5 text-slate-400'} />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs sm:col-span-2 lg:col-span-1">
              <span className="text-slate-400 text-xs font-medium block">Total Platform Turnover</span>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xl font-display font-extrabold text-emerald-600">₹{totalRevenue.toLocaleString('en-IN')}</span>
                <Database className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Unassigned Deliveries Table */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-display">Deliveries Pending Truck/Godown Routing ({pendingAssCount})</h3>
                <button onClick={fetchData} className="text-slate-500 hover:text-slate-800 flex items-center gap-1.5 text-xs font-medium bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer active:scale-95">
                  <RefreshCcw className="w-3.5 h-3.5" /> Sync
                </button>
              </div>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {deliveries.filter((d) => d.status === 'REQUESTED' || d.status === 'ADMIN_REVIEWED').length === 0 ? (
                  <p className="text-slate-400 text-xs text-center py-10">No pending assignments on workload queue.</p>
                ) : (
                  deliveries.filter((d) => d.status === 'REQUESTED' || d.status === 'ADMIN_REVIEWED').map((del) => (
                    <div key={del.id} className="border border-slate-100 p-3 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs hover:bg-slate-50 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 font-mono">{del.id}</span>
                          <span className="text-[10px] text-slate-400">{del.goodsCategory} | {del.goodsWeightKg} kg</span>
                        </div>
                        <span className="font-bold text-slate-800 block mt-1">{del.goodsDescription}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Route: {del.pickupLocation} ➔ {del.destinationLocation}</span>
                      </div>
                      <div className="flex gap-2 text-xs font-semibold justify-end flex-wrap sm:flex-nowrap">
                        <button
                          onClick={() => handleStatusTransition(del.id, 'ADMIN_REVIEWED')}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 min-h-[38px] rounded-lg transition-all active:scale-95 cursor-pointer inline-flex items-center justify-center shadow-xs"
                        >
                          Approve Review
                        </button>
                        <button
                          onClick={() => openAIWorkstation(del.id)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 min-h-[38px] rounded-lg flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs inline-flex items-center justify-center"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> FLEETR-MIND Routing
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* High Priority compliance alarm list */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-850 uppercase tracking-widest font-display">Compliance Anomaly Alerts ({anomalies.length})</h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {anomalies.length === 0 ? (
                  <p className="text-slate-400 text-xs text-center py-10">All active operations cleared by compliance checks.</p>
                ) : (
                  anomalies.map((an, idx) => (
                    <div key={idx} className="border border-rose-100 bg-rose-50/50 p-3 rounded-lg text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-rose-600 uppercase tracking-wider">{an.type} ALERT</span>
                        <span className="text-slate-500 font-mono">SOURCE: {an.source}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 mt-0.5">{an.message}</h4>
                      <p className="text-slate-600 text-[10px] leading-relaxed">{an.details}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        )
      )}

      {/* PIPELINE DISPATCH BOARD WORKSPACE */}
      {activeWorkstation === 'PIPELINE' && (
        loading ? (
          <TableSkeleton
            title="Master Dispatch Pipeline Workstation"
            headers={['Order ID', 'Consignment details', 'Locations Route', 'Status state', 'Actions']}
            rowCount={5}
          />
        ) : (
        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-display">Master Dispatch Pipeline Workstation</h3>
            <span className="text-xs font-mono font-medium text-slate-400">Total Tracked: {deliveries.length} Consignments</span>
          </div>

          <div className="w-full overflow-x-auto -mx-3.5 sm:mx-0 px-3.5 sm:px-0">
            <table className="w-full text-xs text-left min-w-[660px]">
              <thead className="bg-[#f8fafc] text-[#64748b] uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Consignment details</th>
                  <th className="px-4 py-3">Locations Route</th>
                  <th className="px-4 py-3 text-center">Status state</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {deliveries.map((del) => (
                  <tr key={del.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3.5 font-mono font-bold">{del.id}</td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold block text-slate-850">{del.goodsDescription}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{del.goodsCategory} | {del.goodsWeightKg} kg</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-slate-700">{del.pickupLocation.split(',')[0]}</span> ➔ <span className="font-bold text-slate-750">{del.destinationLocation.split(',')[0]}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="font-mono text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-250">
                        {del.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-1.5 align-middle whitespace-nowrap">
                      {del.status === 'ADMIN_REVIEWED' && (
                        <button
                          onClick={() => openAIWorkstation(del.id)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 min-h-[38px] rounded-lg text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer inline-flex items-center justify-center shadow-xs"
                        >
                          ROUTE AI
                        </button>
                      )}
                      {del.status === 'TRUCK_ASSIGNED' && (
                        <button
                          onClick={() => triggerPaymentRequest(del.id)}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 min-h-[38px] rounded-lg text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer inline-flex items-center justify-center shadow-xs"
                        >
                          Request Settle Bill
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMoreDel && (
            <div className="pt-4 flex justify-center border-t border-slate-100">
              <button
                onClick={handleLoadMoreDeliveries}
                disabled={loadingMoreDel}
                className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-semibold px-5 py-2 rounded-lg text-xs tracking-wider uppercase transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {loadingMoreDel ? 'Loading More Consignments...' : 'Load Next Page (Cursor)'}
              </button>
            </div>
          )}
        </div>
        )
      )}

      {/* FLEETR-MIND RECOMMANDATION ROUTER WORKSPACE */}
      {activeWorkstation === 'WORKSPACE' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-6">
            <div className="border-b border-indigo-100 pb-3 flex justify-between items-center text-xs">
              <span className="font-bold text-indigo-700 flex items-center gap-1">
                <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" /> FLEETR-MIND LOGISTICS OPTIMIZER
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-slate-500">TARGET: {selectedDelId}</span>
                <button
                  onClick={() => setActiveWorkstation('TRACKING')}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold flex items-center gap-1 uppercase transition-all shadow-xs cursor-pointer"
                >
                  <Compass className="w-3 h-3" />
                  <span>Interactive Radar Map</span>
                </button>
              </div>
            </div>

            {/* Smart trucks list recommended by model scoring */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-display">Recommend Carrier Trucks</h3>
              <div className="space-y-3">
                {aiTrucks.slice(0, 3).map((trk: any, idx: number) => (
                  <div key={idx} className="border border-slate-100 p-3 rounded-lg hover:bg-slate-50/50 transition-all flex justify-between gap-4 items-center">
                    <div className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-850 font-mono">{trk.vehicleNumber}</span>
                        <span className="text-[10px] font-mono text-indigo-650 bg-indigo-50 p-0.5 rounded font-extrabold">SCORE: {trk.score}%</span>
                      </div>
                      <p className="text-slate-600 mt-1 text-[10px] leading-relaxed">{trk.explanation}</p>
                    </div>
                    <button
                      onClick={() => executeRecommendation(trk.vehicleId, aiGodowns[0]?.godownId)}
                      className="bg-slate-950 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded text-[10px] uppercase transition-all whitespace-nowrap"
                    >
                      Accept Assignment
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended transit point godowns */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-display">Recommend Godown Transit waypoint</h3>
              <div className="space-y-3">
                {aiGodowns.slice(0, 2).map((gdn: any, idx: number) => (
                  <div key={idx} className="border border-slate-100 p-3 rounded-lg hover:bg-slate-50/50 transition-all flex justify-between gap-4 items-center">
                    <div className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{gdn.name}</span>
                        <span className="text-[10px] font-mono text-indigo-650 bg-indigo-50 p-0.5 rounded font-extrabold">SCORE: {gdn.score}%</span>
                      </div>
                      <p className="text-slate-600 mt-1 text-[10px] leading-relaxed">{gdn.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Override controls */}
          <form onSubmit={executeOverride} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 h-fit">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-display flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-500" /> Manual Override Controls
            </h3>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              If local routing conditions or customer demands vary, override the smart model recommendations. All overrides require an audit justification.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Target Carrier Vehicle *</label>
                <select
                  value={overrideVehicleId}
                  onChange={(e) => setOverrideVehicleId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none"
                >
                  <option value="">-- Choose fleet truck --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.vehicleType})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Target Intermediate Warehouse</label>
                <select
                  value={overrideGodownId}
                  onChange={(e) => setOverrideGodownId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none"
                >
                  <option value="">-- Choose godown --</option>
                  {godowns.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Manual Override Justification Reason *</label>
                <textarea
                  required
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="State the commercial or operational scheduling reason for overriding AI."
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none h-20"
                />
              </div>
            </div>

            <button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded text-xs uppercase tracking-wider transition-colors">
              Authorize Override Approval
            </button>
          </form>
        </div>
      )}

      {/* COMPLIANCE TESTING AND GATEWAYS WORKSPACE */}
      {activeWorkstation === 'COMPLIANCE' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-6">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-display flex items-center gap-1">
              <Database className="w-3.5 h-3.5" /> Tracked Heavy Cargo Fleet Verifying Registry
            </h3>
            
            <div className="w-full overflow-x-auto -mx-3.5 sm:mx-0 px-3.5 sm:px-0 text-xs text-left">
              <table className="w-full min-w-[580px]">
                <thead className="bg-[#f8fafc] text-slate-500">
                  <tr>
                    <th className="p-3">Vehicle</th>
                    <th className="p-3">Fitness Validity</th>
                    <th className="p-3">FASTAG Settle status</th>
                    <th className="p-3">eChallans</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold align-middle">{v.vehicleNumber}</td>
                      <td className="p-3 font-medium align-middle">
                        <span className={new Date(v.fitnessValidUntil) < new Date() ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                          {v.fitnessValidUntil}
                        </span>
                      </td>
                      <td className="p-3 align-middle font-semibold text-slate-750">
                        ₹{v.fastagBalance} ({v.fastagStatus})
                      </td>
                      <td className="p-3 align-middle font-bold text-rose-600">
                        {v.pendingChallansCount} Challans No.
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-display">FLEETR-MIND Diagnostics</h3>
            <div className="border border-indigo-100 bg-indigo-50/50 p-4 rounded-xl text-xs space-y-2 leading-relaxed">
              <p className="font-semibold text-indigo-900 flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" /> Live Anomaly Engine Settle
              </p>
              <p className="text-[10px] text-slate-600">
                Model runs continuous background scanning of RC/fitness databases, highway toll plazas log timings, SARATHI Commercial licenses and Regular Courts blacklists.
              </p>
            </div>
            {anomalies.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {anomalies.map((an, idx) => (
                  <div key={idx} className="p-2.5 bg-rose-50 border border-rose-100/50 rounded-lg text-[10px] text-rose-900">
                    <span className="font-bold flex items-center gap-1 capitalize">⚠️ {an.message}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 text-center py-6">All systems fully operational.</p>
            )}
          </div>
        </div>
      )}

      {/* USER LIST PROFILE MODERATOR */}
      {activeWorkstation === 'USERS' && (
        loading ? (
          <TableSkeleton
            title="Platform User Profile Roster"
            headers={['User Name', 'Email Address', 'SaaS Role', 'GSTIN profile ID', 'Moderator status']}
            rowCount={5}
          />
        ) : (
        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-sm animate-in fade-in duration-300">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-display">Platform User Profile Roster</h3>
            <span className="text-[10px] text-slate-400 font-mono">Verified registries matched</span>
          </div>

          <div className="w-full overflow-x-auto -mx-3.5 sm:mx-0 px-3.5 sm:px-0 text-xs text-left">
            <table className="w-full min-w-[620px]">
              <thead className="bg-[#f8fafc] text-[#64748b] border-b border-slate-200 pb-2">
                <tr>
                  <th className="p-3">User & Org Name</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">SaaS Role</th>
                  <th className="p-3">Account Status</th>
                  <th className="p-3 text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {usersList.map((u) => {
                  const isUpdating = updatingUserId === u.id;
                  const isDeleting = deletingUserId === u.id;
                  const isProtectedAdmin =
                    u.role === 'ADMIN' ||
                    u.id === 'usr_admin' ||
                    u.email === 'emonpoddar01@gmail.com' ||
                    u.email === 'nilavra.s2007@gmail.com';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/55 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">{u.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {u.id}</div>
                      </td>
                      <td className="p-3 font-mono text-xs">{u.email}</td>
                      <td className="p-3">
                        <span className={`font-mono text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                          u.role === 'ADMIN'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : u.role === 'BUSINESS_OWNER'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : u.role === 'TRUCK_OWNER'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        }`}>
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : u.status === 'SUSPENDED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 font-black'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            u.status === 'ACTIVE' ? 'bg-emerald-500' : u.status === 'SUSPENDED' ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'
                          }`} />
                          {u.status}
                        </span>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        {isProtectedAdmin ? (
                          <span className="text-[11px] font-mono text-slate-400 italic px-2 py-1 bg-slate-100 rounded">
                            Master Superuser (Protected)
                          </span>
                        ) : (
                          <div className="inline-flex items-center gap-2">
                            {/* Suspend / Reactivate Button */}
                            <button
                              onClick={() => updateUserStatus(u.id, u.status)}
                              disabled={isUpdating || isDeleting}
                              className={`font-bold px-3 py-1.5 min-h-[34px] rounded-lg text-xs uppercase tracking-wide transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1.5 ${
                                u.status === 'SUSPENDED'
                                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                              } disabled:opacity-50`}
                            >
                              {u.status === 'SUSPENDED' ? (
                                <>
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{isUpdating ? 'Activating...' : 'Reactivate Account'}</span>
                                </>
                              ) : (
                                <>
                                  <Ban className="w-3.5 h-3.5 text-amber-600" />
                                  <span>{isUpdating ? 'Suspending...' : 'Suspend Account'}</span>
                                </>
                              )}
                            </button>

                            {/* Delete Account & Cascading Data Button */}
                            <button
                              onClick={() => setUserToDelete(u)}
                              disabled={isUpdating || isDeleting}
                              className="font-bold px-3 py-1.5 min-h-[34px] rounded-lg text-xs uppercase tracking-wide transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 shadow-2xs disabled:opacity-50"
                              title="Delete account and all associated database records"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{isDeleting ? 'Deleting...' : 'Delete Account'}</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        )
      )}

      {/* AUDIT LOG MASTER REPORT */}
      {activeWorkstation === 'AUDIT' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-in fade-in duration-300">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-display">Administrative Security Audit logs</h3>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="border border-slate-100 p-3.5 rounded-lg text-xs hover:bg-slate-50/50 transition-all flex flex-col md:flex-row justify-between items-start gap-3">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-extrabold">IP: {log.ipPlaceholder}</span>
                    <span className="font-bold text-slate-850 uppercase">{log.action}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-[10px] text-slate-500">By: {log.userName} ({log.userRole})</span>
                  </div>
                  <p className="text-slate-600 mt-1.5 font-medium leading-relaxed">{log.details}</p>
                </div>
                <span className="text-[10px] text-slate-400 font-mono self-end md:self-start whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DRIVER TELEMETRY & ROUTE TRACKING WORKSTATION */}
      {activeWorkstation === 'TRACKING' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-950 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono">
            <div>
              <h3 className="text-sm font-extrabold text-emerald-400 uppercase tracking-widest font-mono flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                Fleetr Core Central Geo-Telemetry Gateway
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 font-sans">
                Real-time admin tracker accessing ULIP VAHAN state metrics, active SARATHI drivers, GPS checkpoints, and active good transport consignment status.
              </p>
            </div>
            <button
              onClick={() => fetchData()}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-400 text-xs font-bold rounded-lg border border-slate-700 tracking-wider transition-all cursor-pointer font-mono"
            >
              🔄 Refresh Feeds
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Drivers list and tracking metrics */}
            <div className="xl:col-span-2 space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-in fade-in duration-300">
                <div className="border-b border-slate-100 pb-3 mb-4 flex justify-between items-center">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                    Registered Carrier Pool & Live Telemetry
                  </h4>
                  <span className="bg-indigo-50 text-indigo-750 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded border border-indigo-100">
                    Active Drivers: {drivers.length}
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {drivers.length === 0 ? (
                    <p className="p-6 text-slate-400 text-center text-xs font-medium">No registered drivers found in the carrier pool. Add fleet assets to get starting.</p>
                  ) : (
                    drivers.map((drv) => {
                      const state = drv.conversationState || 'OFF_DUTY';
                      
                      const stateThemes: Record<string, { bg: string, textLabel: string, text: string }> = {
                        OFF_DUTY: { bg: 'bg-slate-100 text-slate-600 border-slate-200', textLabel: 'OFF DUTY', text: 'Idle (Rest Period)' },
                        CHECKIN_SENT: { bg: 'bg-sky-50 text-sky-700 border-sky-100', textLabel: 'DAILY CHECK-IN SENT', text: 'Awaiting Response' },
                        AVAILABLE: { bg: 'bg-emerald-50 text-emerald-750 border-emerald-100', textLabel: 'AVAILABLE', text: 'On Standby in Fleet Pool' },
                        ASSIGNED: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-100', textLabel: 'TRIP ASSIGNED', text: 'En route to Cargo Pickup Terminal' },
                        AWAIT_PICKUP_LOCATION: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-100', textLabel: 'AWAIT PICKUP GPS', text: 'Approaching Warehouse checkpoint' },
                        LOADING: { bg: 'bg-violet-50 text-violet-750 border-violet-100', textLabel: 'CARGO LOADING', text: 'At Loading Dock (Manifest Verification)' },
                        DISPATCH_SENT: { bg: 'bg-violet-50 text-violet-750 border-violet-100', textLabel: 'DISPATCH SEALED', text: 'Departing Hub' },
                        IN_TRANSIT: { bg: 'bg-amber-50 text-amber-700 border-amber-150 animate-pulse', textLabel: 'IN HIGHWAY TRANSIT', text: 'En Route to Destination Ahmedabad Hub' },
                        AWAIT_DELIVERY_LOCATION: { bg: 'bg-amber-50 text-amber-700 border-amber-100', textLabel: 'DESTINATION GPS PENDING', text: 'Arrived at Destination Warehouse' },
                        PAYOUT_PENDING: { bg: 'bg-orange-50 text-orange-700 border-orange-100 animate-pulse', textLabel: 'PAYOUT INCOMING', text: 'Destination Verified, Settlement Pending' },
                        PAID: { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', textLabel: 'PAYMENT SETTLED', text: 'Payout Completed cleanly' },
                        RETURN_CHECK: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-100', textLabel: 'RETURN CHECK', text: 'Sourcing Backhaul Cargo' }
                      };

                      const currentTheme = stateThemes[state] || stateThemes.OFF_DUTY;

                      let locationText = "Co-Locating: Standby Base Depot";
                      let latitude = 19.122;
                      let longitude = 72.894;
                      let progressPercent = 0;

                      if (state === 'IN_TRANSIT') {
                        locationText = "Express route NH-48 near Vadodara highway (Lat: 22.307, Lng: 73.181)";
                        latitude = 22.307;
                        longitude = 73.181;
                        progressPercent = 65;
                      } else if (state === 'ASSIGNED' || state === 'AWAIT_PICKUP_LOCATION' || state === 'LOADING' || state === 'DISPATCH_SENT') {
                        locationText = "Central Logistics Yard Mumbai Port (Lat: 19.122, Lng: 72.894)";
                        latitude = 19.122;
                        longitude = 72.894;
                        progressPercent = 10;
                      } else if (state === 'AWAIT_DELIVERY_LOCATION' || state === 'PAYOUT_PENDING' || state === 'PAID') {
                        locationText = "Ahmedabad Warehouse spatial hub (Lat: 23.012, Lng: 72.589)";
                        latitude = 23.012;
                        longitude = 72.589;
                        progressPercent = 100;
                      } else if (state === 'AVAILABLE') {
                        locationText = "Base Depot (Lat: 21.170, Lng: 72.831 - Surat Transit hub)";
                        latitude = 21.170;
                        longitude = 72.831;
                        progressPercent = 0;
                      }

                      return (
                        <div key={drv.id} className="py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/50 p-3 rounded-lg transition-all">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-extrabold uppercase text-slate-900 font-display">{drv.name}</span>
                              <span className={`px-2 py-0.5 rounded text-[8.5px] font-mono font-black border uppercase tracking-wider ${currentTheme.bg}`}>
                                {currentTheme.textLabel}
                              </span>
                              <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded border ${drv.sarathiVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-rose-50 text-rose-700 border-rose-150'}`}>
                                {drv.sarathiVerified ? 'DL ACTIVE' : 'DL PENDING'}
                              </span>
                            </div>

                            <p className="text-[10px] font-mono text-slate-500 py-0.5">
                              📞 Contacts: <b>{drv.phone}</b> | DL number: <span className="text-indigo-650 font-bold">{drv.dlNumber}</span>
                            </p>

                            <div className="mt-2 bg-slate-50 border border-slate-100 p-3 rounded-lg text-[10px]">
                              <div className="flex justify-between font-mono font-bold text-slate-700 mb-1">
                                <span className="text-[9.5px]">Transit Track: <span className="text-indigo-750">{currentTheme.text}</span></span>
                                {progressPercent > 0 && <span className="text-emerald-700 font-black">{progressPercent}% Tracked</span>}
                              </div>
                              <p className="text-slate-500 font-sans tracking-wide leading-relaxed mt-1 font-medium">
                                Coordinates: {locationText}
                              </p>
                              {progressPercent > 0 && (
                                <div className="mt-2 w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                                  <div className="bg-emerald-600 h-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end shrink-0 gap-1.5 w-full md:w-auto">
                            <a
                              href={`https://wa.me/${drv.phone.replace(/[+\s-]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full md:w-auto text-center bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold px-3.5 py-2 min-h-[38px] rounded-lg text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95 inline-flex items-center justify-center"
                            >
                              💬 Outbound WhatsApp Chat
                            </a>
                            <div className="text-[9px] font-mono text-slate-400 self-end font-semibold">
                              State Update Checkpoint: {drv.lastInboundAt ? new Date(drv.lastInboundAt).toLocaleTimeString() : 'Current Sync'}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Simulated route and cargo telemetry panel */}
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-300">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                  Good Transport Status Board
                </h4>

                <div className="space-y-3.5">
                  <div className="bg-slate-50 p-3.5 border border-slate-150 rounded-lg space-y-2">
                    <span className="text-[9px] uppercase font-mono font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded leading-none block w-max select-none">Consignment Tracking Envelope</span>
                    <div className="space-y-1.5 mt-2.5 text-[10px]">
                      <div className="flex justify-between text-slate-500">
                        <span>Consignments En Route:</span>
                        <span className="font-mono font-bold text-slate-800">
                          {deliveries.filter((d) => d.status === 'IN_TRANSIT' || d.status === 'DISPATCHED' || d.status === 'AT_GODOWN').length} Loaded
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Geofence Compliance:</span>
                        <span className="font-mono text-emerald-700 font-bold">100% Verified (ULIP)</span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-150 rounded-xl p-4 bg-slate-50/50 space-y-3">
                    <span className="text-[9px] font-mono font-extrabold text-slate-500 block select-none uppercase tracking-widest">Route Milestones Gateway</span>
                    <div className="relative pl-5 space-y-4 before:absolute before:left-1.5 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-slate-200">
                      <div className="relative text-[10px] leading-snug">
                        <span className="absolute -left-[19px] top-0.5 w-2.5 h-2.5 bg-emerald-600 rounded-full border border-white"></span>
                        <div className="font-bold text-slate-900">1. Origin: Mumbai hub check</div>
                        <p className="text-slate-500 text-[9px] mt-0.5 leading-snug">Fastag readers verified exit manifest e-way, driver approved DL.</p>
                      </div>
                      <div className="relative text-[10px] leading-snug">
                        <span className="absolute -left-[19px] top-0.5 w-2.5 h-2.5 bg-emerald-600 rounded-full border border-white animate-pulse"></span>
                        <div className="font-bold text-slate-800">2. Middle: NH-48 Surat/Vadodara</div>
                        <p className="text-slate-400 text-[9px] mt-0.5 leading-snug">Continuous geofencing tracking matching GPS coordinate parameters.</p>
                      </div>
                      <div className="relative text-[10px] leading-snug">
                        <span className="absolute -left-[19px] top-0.5 w-2.5 h-2.5 bg-slate-300 rounded-full border border-white"></span>
                        <div className="font-bold text-slate-400">3. Terminal: Ahmedabad entry</div>
                        <p className="text-slate-400 text-[9px] mt-0.5 leading-snug">Verify 500m geofence bubble arrival to trigger immediate RazorpayX settlement.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PERMANENT USER & CASCADE DATA DELETE MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Permanently Delete User Account?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  This action will permanently delete this account and purge all associated records from the cloud database. This cannot be undone.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center text-slate-600">
                <span className="text-slate-400">User:</span>
                <span className="font-bold text-slate-800">{userToDelete.name}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="text-slate-400">Email:</span>
                <span className="text-slate-800">{userToDelete.email}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="text-slate-400">Role:</span>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold uppercase text-[10px]">
                  {userToDelete.role.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="text-slate-400">Account ID:</span>
                <span className="text-slate-500 text-[10px]">{userToDelete.id}</span>
              </div>
            </div>

            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                Associated Records That Will Be Cascadingly Deleted:
              </p>
              <ul className="list-disc list-inside text-[11px] text-rose-700 space-y-0.5 pl-1">
                <li>All shipments, deliveries & manifests</li>
                <li>All registered fleet trucks and vehicles</li>
                <li>All drivers, SARATHI verifications & records</li>
                <li>All godowns, warehouses & storage hubs</li>
                <li>All assignments, invoices & payment transactions</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deletingUserId === userToDelete.id}
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingUserId === userToDelete.id}
                onClick={() => confirmDeleteUserAccount(userToDelete)}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-all cursor-pointer inline-flex items-center gap-2 disabled:opacity-50 active:scale-95"
              >
                {deletingUserId === userToDelete.id ? (
                  <>
                    <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Purging Cloud Database Records...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Permanent Deletion</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
