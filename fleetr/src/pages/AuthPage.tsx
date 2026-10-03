/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { apiRequest } from '../utils/api';
import { User, UserRole, UserStatus } from '../types';
import { KeyRound, Shield, Users, Package, Truck, Warehouse } from 'lucide-react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth, sanitizeForFirestore } from '../lib/firebase';

interface AuthPageProps {
  onLoginSuccess: (user: User | null) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  
  // Login input states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup/Onboarding status flag
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardUid, setOnboardUid] = useState('');
  const [onboardEmail, setOnboardEmail] = useState('');

  // Signup onboarding fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('BUSINESS_OWNER');
  const [gstin, setGstin] = useState('');
  const [comName, setComName] = useState('');
  const [address, setAddress] = useState('');

  // Local state for Signup credentials
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Checks Firestore for user doc; if exists, syncs backend and logs in. Otherwise, triggers Onboarding.
  const checkUserDocument = async (uid: string, emailStr: string, fallbackName?: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const profileData = userSnap.data() as User;
        
        // If master admin email, strictly lock role to ADMIN
        if (emailStr === 'emonpoddar01@gmail.com' || emailStr === 'nilavra.s2007@gmail.com') {
          profileData.role = 'ADMIN';
        }

        // Account suspension check
        if (profileData.status === 'SUSPENDED') {
          setErrorMsg('Account Suspended: This user profile has been suspended by the platform administrator. Access to portals is restricted.');
          setLoading(false);
          return;
        }

        // Sync profile state with Express backend
        const syncResp = await apiRequest('/auth/register', 'POST', {
          id: profileData.id,
          name: profileData.name,
          email: profileData.email,
          phone: profileData.phone,
          role: profileData.role,
          gstin: profileData.gstin,
          companyName: profileData.organizationName,
          address: profileData.address
        });

        if (syncResp.success) {
          setSuccessMsg('Session verified. Entering logistics pipeline...');
          setTimeout(() => {
            onLoginSuccess(profileData);
          }, 1000);
        }
      } else {
        // Need onboarding form registration
        setOnboardUid(uid);
        setOnboardEmail(emailStr);
        if (fallbackName) {
          setName(fallbackName);
        }
        setShowOnboarding(true);
        setSuccessMsg('Authenticating success! Setup your operational profile to finalize registration.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error occurred loading your user profile.');
    }
  };

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
        const user = userCredential.user;
        await checkUserDocument(user.uid, user.email || loginEmail);
      } catch (fbErr: any) {
        // Fallback to backend authentication check
        const apiResp = await apiRequest('/auth/login', 'POST', {
          email: loginEmail,
          password: loginPassword
        }).catch(() => null);

        if (apiResp?.success && apiResp.user) {
          setSuccessMsg('Session authenticated. Loading workspace...');
          setTimeout(() => {
            onLoginSuccess(apiResp.user);
          }, 500);
          return;
        }

        throw fbErr;
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrorMsg('Invalid credentials. Check your email and password entry.');
      } else {
        setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailPasswordSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!signupEmail || !signupPassword) {
      setErrorMsg('Please enter email and password credentials.');
      return;
    }
    if (signupPassword.length < 6) {
      setErrorMsg('Password should be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, signupEmail, signupPassword);
      const user = userCredential.user;
      setOnboardUid(user.uid);
      setOnboardEmail(user.email || signupEmail);
      setShowOnboarding(true);
      setSuccessMsg('Credential registered. Complete setup profile inputs.');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to create password profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      await checkUserDocument(user.uid, user.email || '', user.displayName || '');
    } catch (err: any) {
      const isDismissal =
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.code === 'auth/user-cancelled' ||
        String(err?.message || '').includes('popup-closed-by-user') ||
        String(err || '').includes('popup-closed-by-user');

      if (isDismissal) {
        // User closed or dismissed the popup window; cleanly reset without raising errors
        setErrorMsg('');
        return;
      }

      console.warn('Google sign-in status:', err?.message || err);
      setErrorMsg(err?.message || 'Google Popup authorization failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const isAdminEmail = onboardEmail === 'emonpoddar01@gmail.com' || onboardEmail === 'nilavra.s2007@gmail.com';
    const effectiveRole: UserRole = isAdminEmail ? 'ADMIN' : (role === 'ADMIN' ? 'BUSINESS_OWNER' : role);

    if (!isAdminEmail && role === 'ADMIN') {
      setErrorMsg('Deactivated: Administrative role registration is forbidden. Create an account with business owner, fleet owner, or warehouse owner roles.');
      return;
    }

    if (!name || !phone || (!gstin && effectiveRole !== 'ADMIN')) {
      setErrorMsg('Please specify Name, Phone number and GSTIN Certificate Profile ID.');
      return;
    }

    setLoading(true);
    try {
      const finalUser: User = {
        id: onboardUid,
        name,
        email: onboardEmail,
        phone,
        role: effectiveRole,
        gstin,
        organizationName: comName || name,
        address: address || '',
        status: 'ACTIVE' as UserStatus,
        createdAt: new Date().toISOString()
      };

      // Write user document straight to Firestore
      await setDoc(doc(db, 'users', onboardUid), sanitizeForFirestore(finalUser));

      // Now register and synchronize Express backend session
      const syncResp = await apiRequest('/auth/register', 'POST', {
        id: onboardUid,
        name,
        email: onboardEmail,
        phone,
        role: effectiveRole,
        gstin,
        companyName: comName || name,
        address
      });

      if (syncResp.success) {
        setSuccessMsg('Profile created! Setting up active real-time dashboard...');
        setTimeout(() => {
          onLoginSuccess(finalUser);
        }, 1200);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Profile storage synchronization failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#f8fafc] animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-4xl w-full overflow-hidden grid grid-cols-1 md:grid-cols-12">
        
        {/* Visual Brand Panel Left Column */}
        <div className="md:col-span-5 bg-slate-900 text-white p-8 flex flex-col justify-between relative overflow-hidden h-full min-h-[320px] md:min-h-[580px]">
          {/* Subtle grid background accent */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
          
          <div className="space-y-6 relative z-10">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-md">
              F
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-display font-black tracking-tight leading-none">
                Fleetr
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed font-sans max-w-xs">
                Unified Indian freight logistics platform connecting consignors, fleet carriers, and godown hubs.
              </p>
            </div>
          </div>

          {/* Core Platform Capabilities */}
          <div className="space-y-3 pt-6 md:pt-0 relative z-10">
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <div className="w-7 h-7 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-blue-400 shrink-0">
                <Package className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-semibold text-white">Consignment Dispatch</p>
                <p className="text-[11px] text-slate-400">End-to-end shipment lifecycle</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <div className="w-7 h-7 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-emerald-400 shrink-0">
                <Truck className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-semibold text-white">Fleet & Carrier Network</p>
                <p className="text-[11px] text-slate-400">Live tracking & toll management</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <div className="w-7 h-7 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-amber-400 shrink-0">
                <Warehouse className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-semibold text-white">Warehouse & Godown Hubs</p>
                <p className="text-[11px] text-slate-400">Inventory & capacity allocation</p>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-mono pt-4 md:pt-0 relative z-10 border-t border-slate-800/80">
            Logistics Command Center
          </div>
        </div>

        {/* Right Form panel */}
        <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-center bg-white space-y-6">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-lg text-xs font-semibold text-center leading-relaxed font-mono">
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-lg text-xs font-semibold text-center leading-relaxed font-mono">
              ✅ {successMsg}
            </div>
          )}

          {showOnboarding ? (
            /* Onboarding Registration Form */
            <form onSubmit={handleOnboardingSubmit} className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
              <div className="space-y-1">
                <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">Complete Profile</h3>
                <p className="text-xs text-slate-500">Provide company credentials to map your dedicated workplace role.</p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[10px] uppercase font-mono tracking-wider">User Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Anand Mahindra"
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-400 block mb-1 text-[10px] uppercase font-mono tracking-wider">Verified Email Address</label>
                  <input
                    type="text"
                    disabled
                    value={onboardEmail}
                    className="w-full bg-slate-100 text-slate-500 border border-slate-200 p-2.5 rounded-lg focus:outline-none font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-[10px] uppercase font-mono tracking-wider">Phone Number *</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +91 9123456789"
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-[10px] uppercase font-mono tracking-wider">SaaS Workspace Role *</label>
                    {onboardEmail === 'emonpoddar01@gmail.com' || onboardEmail === 'nilavra.s2007@gmail.com' ? (
                      <div className="w-full bg-slate-100 border border-slate-200 p-2.5 rounded-lg text-slate-800 font-mono font-bold text-xs flex items-center gap-1.5">
                        <span>👑 Master Admin Platform (Locked)</span>
                      </div>
                    ) : (
                      <select
                        value={role === 'ADMIN' ? 'BUSINESS_OWNER' : role}
                        onChange={(e) => setRole(e.target.value as UserRole)}
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg cursor-pointer"
                      >
                        <option value="BUSINESS_OWNER">Business Owner</option>
                        <option value="TRUCK_OWNER">Truck/Fleet Owner</option>
                        <option value="GODOWN_OWNER">Godown/Warehouse Owner</option>
                      </select>
                    )}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[10px] uppercase font-mono tracking-wider">
                    GSTIN Certificate Profile ID {role !== 'ADMIN' && '*'}
                  </label>
                  <input
                    type="text"
                    required={role !== 'ADMIN'}
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder={role === 'ADMIN' ? 'Optional for administrator account' : 'e.g. 27AAAAA0000A1Z1'}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-mono font-semibold uppercase"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[10px] uppercase font-mono tracking-wider">Registered Company Name</label>
                  <input
                    type="text"
                    value={comName}
                    onChange={(e) => setComName(e.target.value)}
                    placeholder="e.g. Mahindra Logistics Ltd"
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[10px] uppercase font-mono tracking-wider">Company Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Physical corporate center details address"
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-mono font-bold py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all mt-3"
              >
                {loading ? 'Initializing workspace...' : 'Save & Onboard User Workspace'}
              </button>
            </form>
          ) : isLogin ? (
            /* Login gateway panel */
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Sign in to your account</h2>
                <p className="text-xs text-slate-500">Enter your credentials to access your workspace dashboard.</p>
              </div>

              {/* Google integration sign in button */}
              <button 
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 py-2.5 px-4 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61c-.28 1.5-.1.84-2.11 2.18v1.8101h3.4001c2.01-1.85 3.845-4.57 3.845-5.8401z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.411-1.81c-.95.64-2.16 1.02-4.549 1.02-3.49 0-6.44-2.36-7.49-5.54H1.0211v1.86C3.0011 20.69 7.1511 24 12 24z"/>
                  <path fill="#FBBC05" d="M4.51 14.76c-.27-.8-.42-1.66-.42-2.55s.15-1.75.42-2.55V7.8H1.02a11.94 11.94 0 000 8.82l3.49-1.86z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-1.42C17.96 1.84 15.24 1 12 1 7.15 1 3 4.31 1.02 8.35L4.51 10.2c1.05-3.18 4-5.45 7.49-5.45z"/>
                </svg>
                <span>Sign in with Google</span>
              </button>

              <div className="flex items-center gap-3 my-2 text-slate-400 text-[10px] font-mono justify-center uppercase">
                <hr className="w-16 border-slate-200" />
                <span>Or continue with email</span>
                <hr className="w-16 border-slate-200" />
              </div>

              <form onSubmit={handleEmailPasswordLogin} className="space-y-4">
                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-mono font-bold text-slate-700 block mb-1 uppercase text-[10px] tracking-wider">Email address</label>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="e.g. name@company.com"
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all text-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-mono font-bold text-slate-700 block mb-1 uppercase text-[10px] tracking-wider">Password</label>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all text-slate-800 text-xs"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-mono font-bold py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all mt-3 shadow-sm cursor-pointer"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    className="text-slate-500 hover:text-slate-900 text-xs font-semibold underline underline-offset-4 cursor-pointer"
                  >
                    Don't have an account? Sign up
                  </button>
                </div>

                {/* Quick Credentials / Admin Login Access Box */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                      Demo & Admin Credentials
                    </span>
                    <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      1-Click Fill
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginEmail('emonpoddar01@gmail.com');
                        setLoginPassword('emon@7890');
                      }}
                      className="text-left p-2 rounded-lg border border-slate-200 bg-slate-50/80 hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer group"
                    >
                      <div className="font-bold text-slate-800 group-hover:text-blue-600 flex items-center justify-between">
                        <span>👑 Master Admin</span>
                        <span className="text-[9px] font-mono text-slate-400 group-hover:text-blue-500">Fill</span>
                      </div>
                      <div className="text-[9px] font-mono text-slate-500 truncate">emonpoddar01@gmail.com</div>
                      <div className="text-[9px] font-mono text-slate-400">Pass: emon@7890</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginEmail('business@fleetr.io');
                        setLoginPassword('demo@1234');
                      }}
                      className="text-left p-2 rounded-lg border border-slate-200 bg-slate-50/80 hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer group"
                    >
                      <div className="font-bold text-slate-800 group-hover:text-blue-600 flex items-center justify-between">
                        <span>📦 Consignor</span>
                        <span className="text-[9px] font-mono text-slate-400 group-hover:text-blue-500">Fill</span>
                      </div>
                      <div className="text-[9px] font-mono text-slate-500 truncate">business@fleetr.io</div>
                      <div className="text-[9px] font-mono text-slate-400">Pass: demo@1234</div>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            /* Signup/Registration Panel */
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Create your account</h2>
                <p className="text-xs text-slate-500 font-sans">Sign up to manage consignments, fleet operations, or godown storage.</p>
              </div>

              {/* Workspace creation role notice */}
              <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-lg flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-blue-600 shrink-0" />
                <p className="text-[11px] text-slate-600">
                  Register as a Business Owner, Fleet Owner, or Warehouse Owner.
                </p>
              </div>

              {/* Google integration sign in button */}
              <button 
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 py-2.5 px-4 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61c-.28 1.5-.1.84-2.11 2.18v1.8101h3.4001c2.01-1.85 3.845-4.57 3.845-5.8401z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.411-1.81c-.95.64-2.16 1.02-4.549 1.02-3.49 0-6.44-2.36-7.49-5.54H1.0211v1.86C3.0011 20.69 7.1511 24 12 24z"/>
                  <path fill="#FBBC05" d="M4.51 14.76c-.27-.8-.42-1.66-.42-2.55s.15-1.75.42-2.55V7.8H1.02a11.94 11.94 0 000 8.82l3.49-1.86z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-1.42C17.96 1.84 15.24 1 12 1 7.15 1 3 4.31 1.02 8.35L4.51 10.2c1.05-3.18 4-5.45 7.49-5.45z"/>
                </svg>
                <span>Sign up with Google</span>
              </button>

              <div className="flex items-center gap-3 my-2 text-slate-400 text-[10px] font-mono justify-center uppercase">
                <hr className="w-16 border-slate-200" />
                <span>Or register with email</span>
                <hr className="w-16 border-slate-200" />
              </div>

              <form onSubmit={handleEmailPasswordSignup} className="space-y-4">
                <div className="space-y-3.5 text-xs font-sans">
                  <div>
                    <label className="font-mono font-bold text-slate-700 block mb-1 uppercase text-[10px] tracking-wider">Email address *</label>
                    <input
                      type="email"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="e.g. name@company.com"
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all text-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-mono font-bold text-slate-700 block mb-1 uppercase text-[10px] tracking-wider">Password *</label>
                    <input
                      type="password"
                      required
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all text-slate-800 text-xs"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-mono font-bold py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all mt-3 cursor-pointer"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    className="text-slate-500 hover:text-slate-800 text-xs font-semibold underline underline-offset-4 cursor-pointer"
                  >
                    Already have an account? Sign in
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
