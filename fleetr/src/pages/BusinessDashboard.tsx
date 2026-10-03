/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { Delivery, Payment, Invoice } from '../types';
import {
  PlusCircle,
  FileText,
  CreditCard,
  Truck,
  MapPin,
  Calendar,
  AlertTriangle,
  Anchor,
  TrendingUp,
  RotateCcw,
  CheckCircle2,
  DollarSign,
  Compass
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MetricCardsSkeleton, TableSkeleton, ListCardSkeleton, ChartSkeleton } from '../components/Skeleton';

export const BusinessDashboard: React.FC = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [goodsDescription, setGoodsDescription] = useState('');
  const [goodsCategory, setGoodsCategory] = useState('Textiles');
  const [goodsWeightKg, setGoodsWeightKg] = useState('');
  const [goodsVolumeCubicCm, setGoodsVolumeCubicCm] = useState('');
  const [goodsValueInr, setGoodsValueInr] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [destinationLocation, setDestinationLocation] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState<'STANDARD' | 'EXPRESS' | 'SAME_DAY'>('STANDARD');
  const [ewayBillNo, setEwayBillNo] = useState('');
  const [consignorGstin, setConsignorGstin] = useState('');
  const [consigneeGstin, setConsigneeGstin] = useState('');
  
  // Modal / Selection state
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CREATE' | 'TRACKING'>('OVERVIEW');
  const [selectedDel, setSelectedDel] = useState<any | null>(null);
  const [payDisclaimerAccepted, setPayDisclaimerAccepted] = useState(false);
  const [delCursor, setDelCursor] = useState<string | null>(null);
  const [hasMoreDel, setHasMoreDel] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const delData = await apiRequest('/deliveries?limit=10');
      setDeliveries(delData.deliveries || []);
      setDelCursor(delData.nextCursor || null);
      setHasMoreDel(Boolean(delData.hasMore));

      const payData = await apiRequest('/payments');
      setPayments(payData.payments || []);

      // Gather invoices
      const invPromises = (delData.deliveries || []).map(async (d: Delivery) => {
        try {
          const detail = await apiRequest(`/deliveries/${d.id}`);
          return detail.invoice;
        } catch {
          return null;
        }
      });
      const invs = (await Promise.all(invPromises)).filter(Boolean);
      setInvoices(invs);
    } catch (err) {
      console.error(err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!delCursor || loadingMore) return;
    try {
      setLoadingMore(true);
      const moreData = await apiRequest(`/deliveries?limit=10&startAfter=${encodeURIComponent(delCursor)}`);
      if (moreData.deliveries && moreData.deliveries.length > 0) {
        setDeliveries((prev) => [...prev, ...moreData.deliveries]);
        setDelCursor(moreData.nextCursor || null);
        setHasMoreDel(Boolean(moreData.hasMore));
      } else {
        setHasMoreDel(false);
      }
    } catch (err) {
      console.error('Error loading more deliveries:', err);
    } finally {
      setLoadingMore(false);
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

  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    // Field validating rules
    if (goodsDescription.length > 500) {
      setErrorMsg('Description must be less than 500 characters.');
      return;
    }
    const weightNum = Number(goodsWeightKg);
    const volumeNum = Number(goodsVolumeCubicCm);
    if (!weightNum || weightNum <= 0 || weightNum > 50000) {
      setErrorMsg('Consignment Weight must be a positive decimal below 50,000 kg.');
      return;
    }
    if (!volumeNum || volumeNum <= 0) {
      setErrorMsg('Volumetric profile must be a positive decimal.');
      return;
    }

    // Minimum tomorrow verification
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const chosenDate = new Date(pickupDate);
    if (chosenDate < tomorrow) {
      setErrorMsg('Pickup date must be tomorrow or later.');
      return;
    }

    try {
      const resp = await apiRequest('/deliveries', 'POST', {
        goodsDescription,
        goodsCategory,
        goodsWeightKg: weightNum,
        goodsVolumeCubicCm: volumeNum,
        goodsValueInr: Number(goodsValueInr) || 100000,
        pickupDate,
        pickupLocation,
        destinationLocation,
        specialInstructions,
        urgencyLevel,
        ewayBillNo,
        consignorGstin,
        consigneeGstin
      });

      if (resp.delivery) {
        setSuccessMsg(`Delivery Consignment ${resp.delivery.id} was created successfully! Checkout bill registered.`);
        // Reset states
        setGoodsDescription('');
        setGoodsWeightKg('');
        setGoodsVolumeCubicCm('');
        setGoodsValueInr('');
        setPickupDate('');
        setPickupLocation('');
        setDestinationLocation('');
        setSpecialInstructions('');
        setEwayBillNo('');
        fetchData();
        setActiveTab('OVERVIEW');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit delivery request.');
    }
  };

  const handleCheckout = async (paymentId: string, deliveryId: string) => {
    if (!payDisclaimerAccepted) {
      setErrorMsg('Acknowledging non-refundable compliance confirmation is required before checking out.');
      return;
    }
    setErrorMsg('');
    try {
      const data = await apiRequest('/payments/capture', 'POST', { paymentId, deliveryId });
      if (data.success) {
        setSuccessMsg('Payment successfully verified and captured! Delivery moved to CONFIRMED pipeline stage. GST Tax invoice registered.');
        fetchData();
        setSelectedDel(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment processing failed.');
    }
  };

  const viewTrackingDetail = async (delId: string) => {
    try {
      const data = await apiRequest(`/deliveries/${delId}`);
      setSelectedDel(data);
      setActiveTab('TRACKING');
    } catch (err) {
      console.error(err);
    }
  };

  // Pipeline summary totals
  const totalSpend = payments.filter((p) => p.status === 'CAPTURED').reduce((acc, curr) => acc + curr.totalAmount, 0);
  const activeOrders = deliveries.filter((d) => !['DELIVERED', 'CANCELLED', 'FAILED'].includes(d.status));
  const pendingPayments = payments.filter((p) => p.status === 'PENDING');
  const dispatchedList = deliveries.filter((d) => d.status === 'DISPATCHED' || d.status === 'IN_TRANSIT');
  const deliveredCount = deliveries.filter((d) => d.status === 'DELIVERED').length;

  // Chart dataset
  const chartData = deliveries.map((d) => {
    const pay = payments.find((p) => p.deliveryId === d.id);
    return {
      id: d.id.substring(4, 9),
      weight: d.goodsWeightKg,
      cost: pay ? pay.totalAmount : 0
    };
  });

  return (
    <div className="p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Dynamic Segmented Tab Picker */}
      <div className="bg-slate-100 p-1.5 rounded-xl flex gap-1.5 self-start border border-slate-200 overflow-x-auto no-scrollbar max-w-full">
        <button
          onClick={() => { setActiveTab('OVERVIEW'); setSelectedDel(null); }}
          className={`px-3.5 sm:px-4 py-2 min-h-[40px] text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap inline-flex items-center justify-center ${activeTab === 'OVERVIEW' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Consignment Overview
        </button>
        <button
          onClick={() => setActiveTab('CREATE')}
          className={`px-3.5 sm:px-4 py-2 min-h-[40px] text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap inline-flex items-center justify-center ${activeTab === 'CREATE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Request New Delivery
        </button>
        {selectedDel && (
          <button
            onClick={() => setActiveTab('TRACKING')}
            className={`px-3.5 sm:px-4 py-2 min-h-[40px] text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap inline-flex items-center justify-center ${activeTab === 'TRACKING' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Tracking: {selectedDel.delivery.id}
          </button>
        )}
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span className="text-xs font-mono font-semibold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-250 text-rose-800 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <span className="text-xs font-mono font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* OVERVIEW MODULE */}
      {activeTab === 'OVERVIEW' && (
        loading ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Key Metrics Cards grid Skeleton */}
            <MetricCardsSkeleton count={5} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Pipelines Area Chart Skeleton */}
              <div className="lg:col-span-2">
                <ChartSkeleton title="Consignment Surcharge Log Distribution" height="h-64" />
              </div>

              {/* Quick Surcharges Settlement sidebar list Skeleton */}
              <div>
                <ListCardSkeleton count={3} title="Bills Pending Gateway Settlement" />
              </div>
            </div>

            {/* Recent Deliveries Table Skeleton */}
            <TableSkeleton
              title="Registered Dispatch Pipeline"
              headers={['Consignment ID', 'Goods', 'Urgency', 'Weight (KG)', 'Route Log', 'Status Badge', 'Actions']}
              rowCount={5}
            />
          </div>
        ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Key Metrics Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs border-l-4 border-l-slate-800">
              <span className="text-slate-400 text-xs font-mono font-bold block uppercase tracking-wider">Active Shipments</span>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xl font-mono font-black text-slate-800">{activeOrders.length}</span>
                <Truck className="w-5 h-5 text-slate-400" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs border-l-4 border-l-amber-500">
              <span className="text-slate-400 text-xs font-mono font-bold block uppercase tracking-wider">Pending Bills</span>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xl font-mono font-black text-amber-600">{pendingPayments.length}</span>
                <CreditCard className="w-5 h-5 text-amber-500" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs border-l-4 border-l-sky-500">
              <span className="text-slate-400 text-xs font-mono font-bold block uppercase tracking-wider">In-Transit Freight</span>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xl font-mono font-black text-sky-600">{dispatchedList.length}</span>
                <TrendingUp className="w-5 h-5 text-sky-500" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs border-l-4 border-l-emerald-500">
              <span className="text-slate-400 text-xs font-mono font-bold block uppercase tracking-wider">Delivered</span>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xl font-mono font-black text-emerald-600">{deliveredCount}</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs border-l-4 border-l-blue-600 sm:col-span-2 lg:col-span-1">
              <span className="text-slate-400 text-xs font-mono font-bold block uppercase tracking-wider">Total spend</span>
              <div className="flex justify-between items-center mt-2">
                <span className="text-lg font-mono font-black text-slate-900 leading-none">
                  ₹{totalSpend.toLocaleString('en-IN')}
                </span>
                <DollarSign className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pipelines Area Chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
              <h3 className="text-xs font-mono font-bold text-slate-800 uppercase tracking-widest mb-4">Consignment Surcharge Log Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="id" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip />
                    <Area type="monotone" dataKey="cost" stroke="#0f172a" fill="#334155" fillOpacity={0.1} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Surcharges Settlement sidebar list */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4">Bills Pending Gateway settlement ({pendingPayments.length})</h3>
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {pendingPayments.length === 0 ? (
                  <p className="text-slate-400 text-xs text-center py-6">All invoice surcharges fully settled</p>
                ) : (
                  pendingPayments.map((pmt) => {
                    const del = deliveries.find((d) => d.id === pmt.deliveryId);
                    return (
                      <div key={pmt.id} className="border border-slate-100 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">{del?.goodsDescription || 'Freight bill'}</span>
                            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">ORDER ID: {pmt.deliveryId}</span>
                          </div>
                          <span className="text-xs font-bold text-rose-600 block">₹{pmt.totalAmount}</span>
                        </div>
                        <button
                          onClick={() => viewTrackingDetail(pmt.deliveryId)}
                          className="mt-2.5 w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-3 min-h-[40px] rounded-lg uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow-xs"
                        >
                          Checkout Razorpay
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Recent Deliveries Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-display">Registered Dispatch Pipeline</h3>
              <button
                onClick={fetchData}
                className="text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 px-3.5 py-1.5 min-h-[38px] rounded-lg border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Sync UI
              </button>
            </div>
            <div className="w-full overflow-x-auto -mx-0.5 sm:mx-0">
              {deliveries.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  No active consignments registered. Get started by booking a new dispatch!
                </div>
              ) : (
                <table className="w-full text-xs text-left min-w-[700px]">
                  <thead className="bg-[#f8fafc] text-[#64748b] font-mono text-[10px] uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3">Consignment ID</th>
                      <th className="px-5 py-3">Goods</th>
                      <th className="px-5 py-3">Urgency</th>
                      <th className="px-5 py-3">Weight (KG)</th>
                      <th className="px-5 py-3">Route Log</th>
                      <th className="px-5 py-3">Status Badge</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {deliveries.map((del) => (
                      <tr key={del.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-semibold">{del.id}</td>
                        <td className="px-5 py-3.5">
                          <span className="font-semibold block text-slate-800">{del.goodsDescription}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{del.goodsCategory}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${del.urgencyLevel === 'SAME_DAY' ? 'bg-rose-50 text-rose-600 border border-rose-100' : del.urgencyLevel === 'EXPRESS' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-100 text-slate-600'}`}>
                            {del.urgencyLevel}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-medium">{del.goodsWeightKg} kg</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-slate-800">{del.pickupLocation.split(',')[0]}</span>
                            <span className="text-slate-400">➔</span>
                            <span className="font-semibold text-slate-800">{del.destinationLocation.split(',')[0]}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200/50">
                            {del.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => viewTrackingDetail(del.id)}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-2 min-h-[38px] rounded-lg text-xs uppercase tracking-wide transition-all active:scale-95 cursor-pointer inline-flex items-center justify-center shadow-xs"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {hasMoreDel && (
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-lg border border-slate-200 transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-2xs"
                >
                  {loadingMore ? 'Fetching Next Batch...' : 'Load More Deliveries (Firestore Pagination)'}
                </button>
              </div>
            )}
          </div>
        </div>
        )
      )}

      {/* CREATE NEW SHIPMENT MODULE */}
      {activeTab === 'CREATE' && (
        <form onSubmit={handleCreateDelivery} className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 sm:space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-display">Logistics Booking Request Formulation</h2>
            <p className="text-xs text-slate-400 mt-1">Specify detailed payload metrics, consignor compliance parameters, and scheduling demands.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">Detailed Goods Description *</label>
              <textarea
                value={goodsDescription}
                onChange={(e) => setGoodsDescription(e.target.value)}
                maxLength={500}
                required
                placeholder="Declare explicit goods type, quantity, fabric specifications, container counts, etc. (Max 500 chars)"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 h-20 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Goods Category *</label>
              <select
                value={goodsCategory}
                onChange={(e) => setGoodsCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="Textiles">Textiles & Garments</option>
                <option value="Electrical Hardware">Electrical Hardware Instruments</option>
                <option value="Heavy Engineering">Heavy Engineering Components</option>
                <option value="Chemicals/Hazmat">Chemicals / Hazardous Elements</option>
                <option value="General Goods">General Merchandise Goods</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Goods Weight (Kg) *</label>
              <input
                type="number"
                step="any"
                value={goodsWeightKg}
                onChange={(e) => setGoodsWeightKg(e.target.value)}
                required
                placeholder="e.g. 8500 (Positive decimal, max 50000)"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Volumetric Profile (Cubic Cm) *</label>
              <input
                type="number"
                value={goodsVolumeCubicCm}
                onChange={(e) => setGoodsVolumeCubicCm(e.target.value)}
                required
                placeholder="e.g. 14000000 (Goods volume size metric)"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Declared Goods Valuation (INR)</label>
              <input
                type="number"
                value={goodsValueInr}
                onChange={(e) => setGoodsValueInr(e.target.value)}
                placeholder="e.g. 1200000 (Valuations above 5,00,000 tag high value safe mode)"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              {Number(goodsValueInr) > 500000 && (
                <span className="text-[10px] text-amber-600 block mt-1 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> High-Value Cargo Warning flagged! Priority escort.
                </span>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Pickup Date (Tomorrow onwards) *</label>
              <input
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Urgency Model level *</label>
              <select
                value={urgencyLevel}
                onChange={(e) => setUrgencyLevel(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="STANDARD">STANDARD Logistics Delivery</option>
                <option value="EXPRESS">EXPRESS Delivery Route</option>
                <option value="SAME_DAY">SAME-DAY Express priority dispatch</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Pickup Location Address *</label>
              <input
                type="text"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                required
                placeholder="e.g. Okhla Phase 2, New Delhi"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Destination Location Address *</label>
              <input
                type="text"
                value={destinationLocation}
                onChange={(e) => setDestinationLocation(e.target.value)}
                required
                placeholder="e.g. Sarkhej, Ahmedabad, Gujarat"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">E-Way Bill Number (Optional)</label>
              <input
                type="text"
                value={ewayBillNo}
                onChange={(e) => setEwayBillNo(e.target.value)}
                placeholder="GST registered e-way bill ID"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Consignor GSTIN Checklist *</label>
              <input
                type="text"
                value={consignorGstin}
                onChange={(e) => setConsignorGstin(e.target.value)}
                placeholder="e.g. 07AAAAA1111A1Z1"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="flex gap-3 sm:gap-4 justify-end pt-4 border-t border-slate-100 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => setActiveTab('OVERVIEW')}
              className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-5 py-2.5 min-h-[44px] rounded-lg uppercase tracking-wider transition-all active:scale-95 cursor-pointer inline-flex items-center justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 min-h-[44px] rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-4 h-4" /> Book Dispatched Cargo
            </button>
          </div>
        </form>
      )}

      {/* TRACKING AND DETAILED VIEW MODULE */}
      {activeTab === 'TRACKING' && selectedDel && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          {/* Tracking progress details card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] text-slate-400 font-mono block">SHIPMENT TRACKING CONTEXT</span>
                <h2 className="text-sm font-bold text-slate-800 uppercase font-display">{selectedDel.delivery.id} ({selectedDel.delivery.goodsCategory})</h2>
              </div>
              <span className="font-mono text-xs font-extrabold text-slate-700 uppercase bg-slate-50 border border-slate-200 px-3 py-1 rounded">
                STAGE: {selectedDel.delivery.status}
              </span>
            </div>

            {/* Simulated map route indicator */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-center items-center h-44 relative overflow-hidden">
              <div className="absolute top-2 left-2 z-10 bg-slate-950/80 text-emerald-400 font-mono text-[9px] px-2 py-0.5 rounded">
                LIVE SAT-GRID RADAR SIMULATOR ACTIVE
              </div>
              <div className="flex items-center gap-6 z-10 w-full justify-around max-w-lg">
                <div className="text-center">
                  <MapPin className="w-6 h-6 text-slate-900 mx-auto" />
                  <span className="text-[10px] font-bold text-slate-800 block mt-1">{selectedDel.delivery.pickupLocation}</span>
                </div>
                <div className="flex-1 flex items-center relative gap-1">
                  <div className="h-0.5 w-full bg-dashed bg-slate-300 flex justify-between">
                    <span className="w-1.5 h-1.5 bg-slate-900 rounded-full"></span>
                    <span className="w-1.5 h-1.5 bg-slate-900 rounded-full"></span>
                  </div>
                  <Truck className="w-5 h-5 text-slate-900 absolute left-1/3 -top-2 animate-bounce" />
                </div>
                <div className="text-center">
                  <MapPin className="w-6 h-6 text-indigo-600 mx-auto" />
                  <span className="text-[10px] font-bold text-indigo-700 block mt-1">{selectedDel.delivery.destinationLocation}</span>
                </div>
              </div>
              {selectedDel.assignedVehicle && (
                <div className="mt-4 text-[10px] text-slate-500 font-mono z-10 text-center">
                  Assigned Cargo Hauler: <span className="font-bold text-slate-800">{selectedDel.assignedVehicle.vehicleNumber}</span> | Driver: <span className="font-bold text-slate-800">{selectedDel.assignedDriver?.name}</span>
                </div>
              )}
            </div>

            {/* Timeline sequence flow indicators */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-display">Route Pipeline Milestone Logs</h3>
              <div className="relative border-l border-slate-200 pl-6 space-y-4 ml-2">
                {[
                  { statusKey: 'REQUESTED', label: 'Cargo Requested', desc: 'Consignment load metrics verified and registered for booking.' },
                  { statusKey: 'TRUCK_ASSIGNED', label: 'VAHAN Checked Carrier Assigned', desc: 'Secure fleet assets linked and compliance audit cleared.' },
                  { statusKey: 'PAYMENT_PENDING', label: 'Rate Surcharges Invoiced', desc: 'Payment order billing computed. Pending checkout verification.' },
                  { statusKey: 'CONFIRMED', label: 'Dispatch Clearance Locked', desc: 'Razorpay billing captured. Carrier ready to depart.' },
                  { statusKey: 'DELIVERED', label: 'Job Terminated', desc: 'Consignment payload securely discharged at final destination.' }
                ].map((item, idx) => {
                  const isCurrent = selectedDel.delivery.status === item.statusKey;
                  const isBefore = idx <= ['REQUESTED', 'TRUCK_ASSIGNED', 'PAYMENT_PENDING', 'CONFIRMED', 'DELIVERED'].indexOf(selectedDel.delivery.status);
                  
                  return (
                    <div key={idx} className="relative text-xs">
                      <span className={`absolute -left-9 top-0.5 rounded-full w-5 h-5 flex items-center justify-center border font-bold text-[10px] ${isCurrent ? 'bg-indigo-600 text-white border-indigo-700 animate-pulse' : isBefore ? 'bg-slate-900 text-white border-slate-950' : 'bg-white text-slate-300 border-slate-200'}`}>
                        {idx + 1}
                      </span>
                      <h4 className={`font-bold ${isCurrent ? 'text-indigo-600' : isBefore ? 'text-slate-800' : 'text-slate-400'}`}>{item.label}</h4>
                      <p className="text-slate-500 text-[10px] mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Billing / Invoice details wrapper panel */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-display">Charges & Settlement Summary</h3>
            
            {selectedDel.payment && (
              <div className="bg-slate-50 p-4 border border-slate-200/50 rounded-xl text-xs space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Base Freight Fee</span>
                  <span className="font-semibold text-slate-800">₹{selectedDel.payment.baseFreight}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Distance Mileage</span>
                  <span className="font-semibold text-slate-800">{selectedDel.payment.distanceKm} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">FASTAG Surcharge Settle</span>
                  <span className="font-semibold text-slate-800">₹{selectedDel.payment.tollSurcharge}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200/50 pt-2.5 font-bold text-slate-800">
                  <span>Gross Surcharge (inc 18% GST)</span>
                  <span>₹{selectedDel.payment.totalAmount}</span>
                </div>
              </div>
            )}

            {/* Check/checkout buttons */}
            {selectedDel.payment && selectedDel.payment.status === 'PENDING' && (
              <div className="space-y-4">
                <div className="border border-amber-100 bg-amber-50 p-3 rounded-lg text-xs leading-relaxed text-amber-800 space-y-2">
                  <label className="flex gap-2 items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={payDisclaimerAccepted}
                      onChange={(e) => setPayDisclaimerAccepted(e.target.checked)}
                      className="mt-0.5 accent-amber-600"
                    />
                    <span className="text-[10px] font-medium select-none">
                      I acknowledge that this logistics dispatch is non-refundable upon clearance locking.
                    </span>
                  </label>
                </div>
                <button
                  onClick={() => handleCheckout(selectedDel.payment.id, selectedDel.delivery.id)}
                  className="w-full bg-slate-950 hover:bg-slate-800 text-white font-bold py-3 min-h-[44px] rounded-lg text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer inline-flex items-center justify-center shadow-xs"
                >
                  Pay ₹{selectedDel.payment.totalAmount} via Secure Gateway (Capture & Confirm)
                </button>
              </div>
            )}

            {selectedDel.payment && selectedDel.payment.status === 'CAPTURED' && (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-center font-semibold text-emerald-800 text-xs">
                  Settle Gateway: Captured & Verified
                </div>
                {selectedDel.invoice && (
                  <a
                    href={`/api/invoices/${selectedDel.invoice.id}/download`}
                    download
                    className="w-full text-center flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 min-h-[44px] rounded-lg text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-slate-600" /> Download LR Invoice Bill
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
