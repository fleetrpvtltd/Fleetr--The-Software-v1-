/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { apiRequest, saveLocalUser, getLocalUser } from './utils/api';
import { User, UserRole } from './types';
import { Header } from './components/Header';
import { AuthPage } from './pages/AuthPage';
import { BusinessDashboard } from './pages/BusinessDashboard';
import { TruckOwnerDashboard } from './pages/TruckOwnerDashboard';
import { GodownDashboard } from './pages/GodownDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { LogOut, RefreshCw, Truck, Warehouse, ShieldAlert, Grid, X, Menu } from 'lucide-react';
import { auth, db } from './lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<User | null>(() => getLocalUser());
  const [loading, setLoading] = useState<boolean>(() => !getLocalUser());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState<'WORKSPACE'>('WORKSPACE');

  const isMasterAdmin =
    user?.role === 'ADMIN' ||
    user?.email === 'emonpoddar01@gmail.com' ||
    user?.email === 'nilavra.s2007@gmail.com';

  useEffect(() => {
    // 1. Core Firebase Authentication Observer
    const unsubscribe = auth.onAuthStateChanged(async (fbUser) => {
      if (fbUser) {
        try {
          const ref = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const profile = snap.data() as User;
            
            // Synchronize the profile session with the Express backend
            await apiRequest('/auth/register', 'POST', {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              phone: profile.phone,
              role: profile.role,
              gstin: profile.gstin,
              companyName: profile.organizationName,
              address: profile.address
            }).catch(() => {});
            saveLocalUser(profile);
            setUser(profile);
          } else {
            // Document does not exist yet (Needs onboarding details saved first)
            const local = getLocalUser();
            if (!local) {
              setUser(null);
            }
          }
        } catch (err) {
          console.warn('Session sync warning:', err);
          // Fallback to check if express already has a session
          const fallback = await apiRequest('/auth/me').catch(() => null);
          if (fallback && fallback.user) {
            saveLocalUser(fallback.user);
            setUser(fallback.user);
          } else {
            const cached = getLocalUser();
            if (cached) {
              setUser(cached);
            } else {
              setUser(null);
            }
          }
        }
      } else {
        // If not in Firebase Auth, check if there is an active local session (e.g. Master Admin)
        const local = getLocalUser();
        if (local) {
          setUser(local);
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Real-time synchronization of account status (e.g. when Admin suspends or deletes account)
  useEffect(() => {
    if (!user || user.role === 'ADMIN') return;

    const syncAccountStatus = async () => {
      try {
        const ref = doc(db, 'users', user.id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const profile = snap.data() as User;
          if (profile.status && profile.status !== user.status) {
            setUser((prev) => (prev ? { ...prev, status: profile.status } : null));
            saveLocalUser({ ...user, status: profile.status });
          }
        } else {
          // User document has been purged/deleted by Admin
          saveLocalUser(null);
          setUser(null);
        }
      } catch {
        // ignore
      }
    };

    // Sync account status on tab focus without continuous polling leak
    window.addEventListener('focus', syncAccountStatus);
    return () => {
      window.removeEventListener('focus', syncAccountStatus);
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await signOut(auth).catch(() => {});
      await apiRequest('/auth/logout', 'POST').catch(() => {});
      saveLocalUser(null);
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserUpdate = (updated: User | null) => {
    saveLocalUser(updated);
    setUser(updated);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] gap-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="text-xs font-semibold text-slate-500 font-mono tracking-wider">Loading secure pipeline gateway...</span>
      </div>
    );
  }

  // Suspended Account Quarantine Screen
  if (user && user.status === 'SUSPENDED' && !isMasterAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
        <div className="max-w-md w-full bg-slate-950/80 border border-rose-500/30 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="w-16 h-16 bg-rose-500/20 border border-rose-500/40 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold font-display text-white tracking-tight">Account Suspended</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your account access has been suspended by the platform administrator. Access to freight dispatch, fleet tracking, and godown hubs is restricted.
            </p>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-xs font-mono text-left space-y-2">
            <div className="flex justify-between items-center text-slate-400">
              <span>Account:</span>
              <span className="text-slate-200 font-bold truncate max-w-[200px]">{user.email}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Designated Role:</span>
              <span className="text-amber-400 font-bold uppercase text-[10px]">{user.role.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Status:</span>
              <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-400 font-bold uppercase text-[10px]">
                SUSPENDED
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg active:scale-98 flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans flex antialiased">
      {user ? (
        <div className="flex w-full min-h-screen">
          {/* Navigation Sidebar */}
          <aside className="hidden lg:flex w-64 bg-slate-900 flex-col h-screen sticky top-0 shrink-0 border-r border-slate-800 z-30 select-none">
            {/* Header Branding */}
            <div className="p-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white text-base shadow-sm">
                  F
                </div>
                <div>
                  <h1 className="text-sm font-black text-white tracking-tight leading-none font-display">
                    Fleetr
                  </h1>
                  <span className="text-[9px] text-slate-500 font-mono block mt-1 tracking-wider uppercase">
                    Logistics Gateway
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Body with Strict Role-Based Portal Access */}
            <nav className="flex-1 px-4 py-6 space-y-7 overflow-y-auto">
              <div className="space-y-2">
                <span className="text-slate-500 text-[9px] font-bold uppercase tracking-widest px-2 block">
                  Dedicated Portal
                </span>
                <div className="space-y-1">
                  {/* Strict Portal Access: Users can ONLY access their designated role portal */}
                  {user.role === 'BUSINESS_OWNER' && (
                    <button
                      onClick={() => setActiveNavTab('WORKSPACE')}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg border transition-all text-left cursor-pointer ${
                        activeNavTab === 'WORKSPACE'
                          ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-sm font-extrabold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border-transparent'
                      }`}
                    >
                      <Grid className="w-4 h-4 shrink-0" />
                      <span>Business Dispatch</span>
                    </button>
                  )}

                  {user.role === 'TRUCK_OWNER' && (
                    <button
                      onClick={() => setActiveNavTab('WORKSPACE')}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg border transition-all text-left cursor-pointer ${
                        activeNavTab === 'WORKSPACE'
                          ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-sm font-extrabold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border-transparent'
                      }`}
                    >
                      <Truck className="w-4 h-4 shrink-0" />
                      <span>Fleet Registry</span>
                    </button>
                  )}

                  {user.role === 'GODOWN_OWNER' && (
                    <button
                      onClick={() => setActiveNavTab('WORKSPACE')}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg border transition-all text-left cursor-pointer ${
                        activeNavTab === 'WORKSPACE'
                          ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-sm font-extrabold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border-transparent'
                      }`}
                    >
                      <Warehouse className="w-4 h-4 shrink-0" />
                      <span>Warehouse Hub</span>
                    </button>
                  )}

                  {user.role === 'ADMIN' && (
                    <button
                      onClick={() => setActiveNavTab('WORKSPACE')}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg border transition-all text-left cursor-pointer ${
                        activeNavTab === 'WORKSPACE'
                          ? 'bg-blue-600/20 text-blue-300 border-blue-500/30 shadow-sm font-extrabold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border-transparent'
                      }`}
                    >
                      <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>Master Admin</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Intelligence System Block */}
              <div className="space-y-2">
                <span className="text-slate-500 text-[9px] font-bold uppercase tracking-widest px-2 block">
                  SaaS Compliance Integrations
                </span>
                <div className="space-y-2 px-2 text-[11px] font-mono">
                  <div className="flex items-center justify-between text-slate-400 bg-slate-800/20 p-2 rounded border border-slate-800/45">
                    <span className="text-slate-500">VAHAN RC:</span>
                    <span className="text-emerald-500 font-bold uppercase text-[9px]">Verified</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 bg-slate-800/20 p-2 rounded border border-slate-800/45">
                    <span className="text-slate-500">SARATHI DL:</span>
                    <span className="text-emerald-500 font-bold uppercase text-[9px]">Authorized</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 bg-slate-800/20 p-2 rounded border border-slate-800/45">
                    <span className="text-slate-500">FLEETR-MIND:</span>
                    <span className="text-blue-400 font-bold uppercase text-[9px]">Active</span>
                  </div>
                </div>
              </div>
            </nav>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/40">
              <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-800 flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-slate-700 flex items-center justify-center text-xs font-black text-slate-300">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-white truncate">{user.name}</p>
                    <p className="text-[9px] font-mono text-slate-400 truncate mt-0.5">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-center py-1.5 rounded-md bg-rose-950/20 hover:bg-rose-950/45 text-rose-400 border border-rose-900/30 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout Session</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Mobile Drawer (Visible on < lg screens) */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close backdrop"
              />

              {/* Drawer Container */}
              <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-900 flex flex-col h-full border-r border-slate-800 z-50 shadow-2xl animate-in slide-in-from-left duration-200">
                {/* Header Branding & Close */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white text-base shadow-sm">
                      F
                    </div>
                    <div>
                      <h1 className="text-sm font-black text-white tracking-tight leading-none font-display">
                        Fleetr
                      </h1>
                      <span className="text-[9px] text-slate-500 font-mono block mt-0.5 tracking-wider uppercase">
                        Logistics Gateway
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
                    aria-label="Close mobile menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Navigation Body */}
                <nav className="flex-1 px-4 py-5 space-y-6 overflow-y-auto">
                  <div className="space-y-2">
                    <span className="text-slate-500 text-[9px] font-bold uppercase tracking-widest px-2 block">
                      Dedicated Portal
                    </span>
                    <div className="space-y-1">
                      {user.role === 'BUSINESS_OWNER' && (
                        <button
                          onClick={() => {
                            setActiveNavTab('WORKSPACE');
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] text-xs font-bold uppercase tracking-wider rounded-lg border transition-all text-left active:scale-98 ${
                            activeNavTab === 'WORKSPACE'
                              ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-sm font-extrabold'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border-transparent cursor-pointer'
                          }`}
                        >
                          <Grid className="w-4 h-4 shrink-0" />
                          <span>Business Dispatch</span>
                        </button>
                      )}

                      {user.role === 'TRUCK_OWNER' && (
                        <button
                          onClick={() => {
                            setActiveNavTab('WORKSPACE');
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] text-xs font-bold uppercase tracking-wider rounded-lg border transition-all text-left active:scale-98 ${
                            activeNavTab === 'WORKSPACE'
                              ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-sm font-extrabold'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border-transparent cursor-pointer'
                          }`}
                        >
                          <Truck className="w-4 h-4 shrink-0" />
                          <span>Fleet Registry</span>
                        </button>
                      )}

                      {user.role === 'GODOWN_OWNER' && (
                        <button
                          onClick={() => {
                            setActiveNavTab('WORKSPACE');
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] text-xs font-bold uppercase tracking-wider rounded-lg border transition-all text-left active:scale-98 ${
                            activeNavTab === 'WORKSPACE'
                              ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-sm font-extrabold'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border-transparent cursor-pointer'
                          }`}
                        >
                          <Warehouse className="w-4 h-4 shrink-0" />
                          <span>Warehouse Hub</span>
                        </button>
                      )}

                      {user.role === 'ADMIN' && (
                        <button
                          onClick={() => {
                            setActiveNavTab('WORKSPACE');
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] text-xs font-bold uppercase tracking-wider rounded-lg border transition-all text-left active:scale-98 cursor-pointer ${
                            activeNavTab === 'WORKSPACE'
                              ? 'bg-blue-600/20 text-blue-300 border-blue-500/30 shadow-sm font-extrabold'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border-transparent'
                          }`}
                        >
                          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                          <span>Master Admin</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* SaaS Compliance Integrations */}
                  <div className="space-y-2">
                    <span className="text-slate-500 text-[9px] font-bold uppercase tracking-widest px-2 block">
                      Compliance Status
                    </span>
                    <div className="space-y-2 px-2 text-[11px] font-mono">
                      <div className="flex items-center justify-between text-slate-400 bg-slate-800/30 p-2 rounded border border-slate-800/60">
                        <span className="text-slate-500">VAHAN RC:</span>
                        <span className="text-emerald-500 font-bold uppercase text-[9px]">Verified</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 bg-slate-800/30 p-2 rounded border border-slate-800/60">
                        <span className="text-slate-500">SARATHI DL:</span>
                        <span className="text-emerald-500 font-bold uppercase text-[9px]">Authorized</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 bg-slate-800/30 p-2 rounded border border-slate-800/60">
                        <span className="text-slate-500">FLEETR-MIND:</span>
                        <span className="text-blue-400 font-bold uppercase text-[9px]">Active</span>
                      </div>
                    </div>
                  </div>
                </nav>

                {/* Mobile Drawer Footer with Prominent Logout */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/60">
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-800 flex flex-col gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center text-xs font-black text-white">
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{user.name}</p>
                        <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">{user.email}</p>
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase bg-blue-900/40 text-blue-300 border border-blue-700/30">
                          {user.role.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-center py-3 min-h-[44px] rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out Session</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Context Right Panel */}
          <div className="flex-1 flex flex-col min-w-0">
            <Header
              user={user}
              onUserUpdate={handleUserUpdate}
              utcTime=""
              onLogout={handleLogout}
              onToggleMobileMenu={() => setMobileMenuOpen(true)}
            />
            <main className="flex-1 pb-20 lg:pb-6">
              {user.role === 'BUSINESS_OWNER' && <BusinessDashboard />}
              {user.role === 'TRUCK_OWNER' && <TruckOwnerDashboard />}
              {user.role === 'GODOWN_OWNER' && <GodownDashboard />}
              {user.role === 'ADMIN' && <AdminDashboard />}
            </main>

            {/* Mobile Bottom Navigation Bar (Thumb-reach friendly) */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2 flex items-center justify-around shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
              <div className="flex items-center gap-2">
                {user.role === 'ADMIN' && <ShieldAlert className="w-5 h-5 text-amber-500" />}
                {user.role === 'BUSINESS_OWNER' && <Grid className="w-5 h-5 text-blue-600" />}
                {user.role === 'TRUCK_OWNER' && <Truck className="w-5 h-5 text-blue-600" />}
                {user.role === 'GODOWN_OWNER' && <Warehouse className="w-5 h-5 text-blue-600" />}
                <span className="text-xs font-bold font-mono uppercase text-slate-800">
                  {user.role === 'ADMIN' ? 'Master Admin' : user.role === 'BUSINESS_OWNER' ? 'Business Dispatch' : user.role === 'TRUCK_OWNER' ? 'Fleet Registry' : 'Warehouse Hub'}
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="flex items-center gap-1.5 py-1.5 px-3 min-h-[40px] rounded-lg transition-all cursor-pointer active:scale-95 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                <Menu className="w-4 h-4" />
                <span>Menu</span>
              </button>
            </nav>
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col min-h-screen">
          <main className="flex-1">
            <AuthPage onLoginSuccess={(u) => { saveLocalUser(u); setUser(u); }} />
          </main>
        </div>
      )}
    </div>
  );
}
