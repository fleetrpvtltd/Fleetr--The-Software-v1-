/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../utils/api';
import { User, Notification, UserRole, Vehicle, Delivery, Godown } from '../types';
import { Bell, ShieldAlert, Award, Clock, ArrowLeftRight, Check, Search, Truck, Package, Warehouse, X, LogOut, Menu } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  onUserUpdate: (updatedUser: User | null) => void;
  utcTime: string;
  onLogout?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onUserUpdate, utcTime, onLogout, onToggleMobileMenu }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotif, setShowNotif] = useState(false);

  // Global Search State - ADMIN Panel only
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    vehicles: Vehicle[];
    deliveries: Delivery[];
    godowns: Godown[];
  }>({ vehicles: [], deliveries: [], godowns: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    type: 'vehicle' | 'delivery' | 'godown';
    data: any;
  } | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isMasterAdmin =
    user?.role === 'ADMIN' ||
    user?.email === 'emonpoddar01@gmail.com' ||
    (typeof window !== 'undefined' && localStorage.getItem('fleetr_is_admin') === 'true');

  useEffect(() => {
    if ((user?.role !== 'ADMIN' && !isMasterAdmin) || !searchQuery.trim()) {
      setSearchResults({ vehicles: [], deliveries: [], godowns: [] });
      setIsSearching(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await apiRequest(`/admin/global-search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults({
          vehicles: data.vehicles || [],
          deliveries: data.deliveries || [],
          godowns: data.godowns || [],
        });
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, user]);

  const fetchNotifs = async () => {
    try {
      const data = await apiRequest('/notifications');
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const switchRole = async (targetRole: UserRole) => {
    try {
      const data = await apiRequest('/auth/switch-role', 'POST', { role: targetRole });
      if (data.success) {
        onUserUpdate(data.user);
        setShowNotif(false);
      }
    } catch (err) {
      // If role switches fail (e.g. not created yet), auto register it on the fly!
      try {
        let name = targetRole.replace('_', ' ').toLowerCase();
        name = name.charAt(0).toUpperCase() + name.slice(1);
        const reg = await apiRequest('/auth/register', 'POST', {
          name,
          email: `${targetRole.toLowerCase()}@fleetr.io`,
          role: targetRole,
          phone: '+919999900000'
        });
        if (reg.success) {
          onUserUpdate(reg.user);
        }
      } catch (regErr) {
        console.error('Auto register fallback failed', regErr);
      }
    }
  };

  const markRead = async (id: string) => {
    try {
      await apiRequest(`/notifications/${id}/read`, 'PATCH');
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="bg-white border-b border-slate-200 h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* Zone 1: Mobile Brand / Desktop Breadcrumb */}
      <div className="flex items-center gap-2.5 sm:gap-4 flex-1 min-w-0 mr-2 sm:mr-4">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden w-10 h-10 flex items-center justify-center text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0 cursor-pointer active:scale-95"
            aria-label="Open mobile navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Mobile branding */}
        <div className="flex items-center gap-2 lg:hidden shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white text-sm shadow-xs">
            F
          </div>
          <span className="font-display font-black text-sm text-slate-900 tracking-tight">
            Fleetr
          </span>
        </div>

        {/* Desktop Context Breadcrumb */}
        {user && (
          <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider">Workspace</span>
            <span className="text-slate-300">/</span>
            <span className="font-bold text-slate-900 font-display text-sm">
              {user.role === 'ADMIN' && 'Master Controls Platform'}
              {user.role === 'BUSINESS_OWNER' && 'Consignment Dispatch'}
              {user.role === 'TRUCK_OWNER' && 'Carrier Fleet Registry'}
              {user.role === 'GODOWN_OWNER' && 'Warehouse & Godown'}
            </span>
          </div>
        )}

        {/* Global Search Feature - ONLY in Admin Panel */}
        {(user?.role === 'ADMIN' || isMasterAdmin) && (
          <div ref={searchRef} className="relative max-w-sm w-full ml-4 hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search truck plates, shipment IDs, godowns..."
                value={searchQuery}
                onFocus={() => setShowSearchResults(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-150 focus:border-indigo-500 rounded-xl text-xs font-mono outline-none transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 p-0.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-md"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {showSearchResults && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 max-h-96 overflow-y-auto z-50 py-1.5 font-sans">
                {isSearching ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-500 font-mono flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    Searching records...
                  </div>
                ) : searchResults.vehicles.length === 0 && searchResults.deliveries.length === 0 && searchResults.godowns.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-400 font-mono">
                    No records found matching "{searchQuery}"
                  </div>
                ) : (
                  <div className="space-y-3">
                    {searchResults.vehicles.length > 0 && (
                      <div>
                        <div className="px-4 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 font-mono border-y border-slate-100 flex items-center gap-1.5">
                          <Truck className="w-3 h-3" />
                          <span>Truck Assets ({searchResults.vehicles.length})</span>
                        </div>
                        <div className="divide-y divide-slate-50">
                          {searchResults.vehicles.map(v => (
                            <button
                              key={v.id}
                              onClick={() => {
                                setSelectedItem({ type: 'vehicle', data: v });
                                setShowSearchResults(false);
                                setSearchQuery('');
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-800 font-mono">{v.vehicleNumber}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{v.vehicleType} • Balance: ₹{v.fastagBalance}</p>
                              </div>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                                v.rcStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                              }`}>
                                {v.rcStatus}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.deliveries.length > 0 && (
                      <div>
                        <div className="px-4 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 font-mono border-y border-slate-100 flex items-center gap-1.5">
                          <Package className="w-3 h-3" />
                          <span>Shipments ({searchResults.deliveries.length})</span>
                        </div>
                        <div className="divide-y divide-slate-50">
                          {searchResults.deliveries.map(d => (
                            <button
                              key={d.id}
                              onClick={() => {
                                setSelectedItem({ type: 'delivery', data: d });
                                setShowSearchResults(false);
                                setSearchQuery('');
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-800 font-mono">{d.id}</p>
                                <p className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]">{d.pickupLocation} → {d.destinationLocation}</p>
                              </div>
                              <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded font-mono uppercase">
                                {d.status.replace('_', ' ')}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.godowns.length > 0 && (
                      <div>
                        <div className="px-4 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 font-mono border-y border-slate-100 flex items-center gap-1.5">
                          <Warehouse className="w-3 h-3" />
                          <span>Godown Centers ({searchResults.godowns.length})</span>
                        </div>
                        <div className="divide-y divide-slate-50">
                          {searchResults.godowns.map(g => (
                            <button
                              key={g.id}
                              onClick={() => {
                                setSelectedItem({ type: 'godown', data: g });
                                setShowSearchResults(false);
                                setSearchQuery('');
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-800">{g.name}</p>
                                <p className="text-[11px] text-slate-400 font-mono">{g.location}</p>
                              </div>
                              <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded font-mono">
                                {g.storageTypes.join(', ')}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Role Switcher Controls & Profile Header Section */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Dynamic role description */}
        {user && (
          <div className="hidden lg:flex flex-col items-end text-right">
            <span className="text-[10px] font-mono font-bold text-slate-400 tracking-wider">WORKSPACE</span>
            <span className="text-xs font-display font-extrabold text-slate-900">
              {user.role === 'ADMIN' && 'Master Controls Platform'}
              {user.role === 'BUSINESS_OWNER' && 'Consignment Dispatch'}
              {user.role === 'TRUCK_OWNER' && 'Carrier Fleet Registry'}
              {user.role === 'GODOWN_OWNER' && 'Warehouse & Godown'}
            </span>
          </div>
        )}

        {/* Dedicated Role Badge - Master Admin is strictly restricted to Admin Platform and cannot switch to other portals */}
        {user?.role === 'ADMIN' || isMasterAdmin ? (
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200/80 px-2.5 sm:px-3 py-1.5 rounded-lg text-amber-800 text-xs font-mono font-bold shadow-2xs">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate">Master Admin Platform</span>
          </div>
        ) : (
          /* Static badge indicating dedicated portal role */
          <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-150 px-2 sm:px-3 py-1.5 rounded-lg text-blue-700 text-xs font-mono font-bold">
            <span>
              {user?.role === 'BUSINESS_OWNER' && 'Business Dispatch'}
              {user?.role === 'TRUCK_OWNER' && 'Carrier Fleet'}
              {user?.role === 'GODOWN_OWNER' && 'Warehouse Hub'}
            </span>
          </div>
        )}

        {/* User Identity context */}
        {user && (
          <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200/50 px-3 py-1 rounded-lg">
            <div className="text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight">{user.name}</p>
              <p className="text-[9px] font-mono text-slate-400">{user.email}</p>
            </div>
          </div>
        )}

        {/* Notification bell button */}
        <div className="relative">
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors relative cursor-pointer active:scale-95 shadow-2xs"
            id="notif-btn"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[9px] font-mono font-bold w-4.5 h-4.5 flex items-center justify-center rounded-md border-2 border-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 mt-3 w-80 max-w-[calc(100vw-32px)] bg-white rounded-xl shadow-xl border border-slate-250 py-1.5 z-50 animate-in fade-in slide-in-from-top-3 max-h-96 overflow-y-auto">
              <div className="px-4 py-2 border-b border-slate-150 flex justify-between items-center bg-slate-50">
                <span className="text-xs font-mono font-bold text-slate-800 uppercase tracking-wide">Live Feed ({unreadCount})</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">Live</span>
                )}
              </div>
              <div className="divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-400 font-mono">
                    No active notifications
                  </div>
                ) : (
                  notifications.map((not) => (
                    <div
                      key={not.id}
                      className={`p-3 text-xs transition-colors hover:bg-slate-50 ${
                        !not.read ? 'bg-blue-50/10 font-medium' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span
                          className={`font-semibold font-display ${
                            not.type === 'ALERT'
                              ? 'text-rose-600'
                              : not.type === 'WARNING'
                              ? 'text-amber-600'
                              : 'text-slate-700'
                          }`}
                        >
                          {not.title}
                        </span>
                        {!not.read && (
                          <button
                            onClick={() => markRead(not.id)}
                            className="text-emerald-600 hover:text-emerald-800 p-0.5 bg-emerald-50 hover:bg-emerald-100 rounded cursor-pointer"
                            title="Mark read"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-slate-500 mt-1 leading-relaxed text-[11px]">{not.message}</p>
                      <span className="text-[9px] text-slate-400 block mt-1.5 font-mono">
                        {new Date(not.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Header Session Logout Button (Visible across mobile & desktop) */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-xs font-bold font-mono transition-all active:scale-95 cursor-pointer shadow-xs shrink-0 min-h-[40px]"
            title="Log out of session"
            aria-label="Log out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        )}
      </div>

      {/* Custom Details Drawer/Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedItem.type === 'vehicle' && <Truck className="w-5 h-5 text-indigo-600" />}
                {selectedItem.type === 'delivery' && <Package className="w-5 h-5 text-indigo-600" />}
                {selectedItem.type === 'godown' && <Warehouse className="w-5 h-5 text-indigo-600" />}
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  {selectedItem.type === 'vehicle' && 'Truck Asset Detail'}
                  {selectedItem.type === 'delivery' && 'Shipment Consignment Detail'}
                  {selectedItem.type === 'godown' && 'Godown Center Detail'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 px-2.5 bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg text-xs font-bold transition-all"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-mono">
              {selectedItem.type === 'vehicle' && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">License Plate</span>
                      <span className="text-sm font-bold text-slate-800">{selectedItem.data.vehicleNumber}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Status flag</span>
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold ${
                        selectedItem.data.rcStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>{selectedItem.data.rcStatus}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Vehicle Type</span>
                      <span className="text-slate-700">{selectedItem.data.vehicleType}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">FASTag balance</span>
                      <span className={`font-bold ${selectedItem.data.fastagBalance < 500 ? 'text-rose-600' : 'text-emerald-600'}`}>₹{selectedItem.data.fastagBalance}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Chassis number</span>
                      <span className="text-slate-600 truncate">{selectedItem.data.chassisNumber}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Engine number</span>
                      <span className="text-slate-600 truncate">{selectedItem.data.engineNumber}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Max capacity</span>
                      <span className="text-slate-700">{selectedItem.data.capacityKg?.toLocaleString()} kg</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Fastag status</span>
                      <span className="text-slate-700 font-bold">{selectedItem.data.fastagStatus}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Vahan checks</span>
                      <span className="text-slate-700">{selectedItem.data.vahanVerified ? '✅ VERIFIED' : '❌ UNVERIFIED'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Pending challans</span>
                      <span className="text-slate-700 font-bold text-rose-600">{selectedItem.data.pendingChallansCount} challans</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedItem.type === 'delivery' && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Shipment ID</span>
                      <span className="text-xs font-bold text-slate-800">{selectedItem.data.id}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Delivery status</span>
                      <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-150 uppercase">{selectedItem.data.status?.replace('_', ' ')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Category</span>
                      <span className="text-slate-700">{selectedItem.data.goodsCategory}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">E-Way Bill</span>
                      <span className="text-slate-700 font-bold">{selectedItem.data.ewayBillNo || 'Not Filed'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Origin</span>
                      <span className="text-slate-605">{selectedItem.data.pickupLocation}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Destination</span>
                      <span className="text-slate-605">{selectedItem.data.destinationLocation}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Cargo Weight</span>
                      <span className="text-slate-700 font-bold">{selectedItem.data.goodsWeightKg?.toLocaleString()} kg</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Est. Goods Value</span>
                      <span className="text-slate-700 font-bold">₹{selectedItem.data.goodsValueInr?.toLocaleString()}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Description</span>
                    <span className="text-slate-600 italic block mt-1">"{selectedItem.data.goodsDescription}"</span>
                  </div>
                </div>
              )}

              {selectedItem.type === 'godown' && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Warehouse Name</span>
                      <span className="text-sm font-bold text-slate-800">{selectedItem.data.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Godown ID</span>
                      <span className="text-xs font-bold text-slate-600">{selectedItem.data.id}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Location (City)</span>
                      <span className="text-slate-700">{selectedItem.data.location}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Storage Types</span>
                      <span className="text-slate-700 font-bold">{selectedItem.data.storageTypes?.join(', ')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Avail / Total capacity</span>
                      <span className="text-slate-600">{selectedItem.data.availableCapacityKg?.toLocaleString()} / {selectedItem.data.totalCapacityKg?.toLocaleString()} kg</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Handling turnaround</span>
                      <span className="text-slate-600 font-bold">{selectedItem.data.handlingTimeHours} Hours</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Street Address Details</span>
                    <span className="text-slate-600 block mt-1">{selectedItem.data.address}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-right">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold rounded-lg transition-all shadow-sm"
              >
                Confirm inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
