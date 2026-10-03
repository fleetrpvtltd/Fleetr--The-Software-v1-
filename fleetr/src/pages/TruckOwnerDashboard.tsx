/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../utils/api';
import { Vehicle, Driver, Delivery } from '../types';
import { findHub } from '../backend/routingEngine';
import { ListCardSkeleton, TableSkeleton, GridCardSkeleton } from '../components/Skeleton';
import {
  Truck,
  UserPlus,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Navigation,
  FileCheck,
  BadgeAlert,
  Loader2,
  ListFilter,
  MessageSquare,
  Send,
  Smartphone,
  ArrowLeft,
  Clock,
  Compass,
  DollarSign,
  Check,
  MapPin,
  User,
  FileText,
  CreditCard,
  Layers,
  HelpCircle,
  PhoneCall
} from 'lucide-react';

export const TruckOwnerDashboard: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [assignments, setAssignments] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  // Driver WhatsApp Integration FSM Simulation states
  const [activeSimDriver, setActiveSimDriver] = useState<Driver | null>(null);
  const [simMessages, setSimMessages] = useState<any[]>([]);
  const [simAuditLogs, setSimAuditLogs] = useState<string[]>([]);
  const [simPayloadLogs, setSimPayloadLogs] = useState<string>('');
  const [simGeofenceAttempts, setSimGeofenceAttempts] = useState<number>(0);
  const [simTextResponse, setSimTextResponse] = useState<string>('');
  const [simTripDetails, setSimTripDetails] = useState<any>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Form states - Fleet vehicle
  const [vehNumber, setVehNumber] = useState('');
  const [chassisNumber, setChassisNumber] = useState('');
  const [engineNumber, setEngineNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Heavy Cargo FTL');
  const [capacityKg, setCapacityKg] = useState('');
  const [volumeCubicCm, setVolumeCubicCm] = useState('');

  // Form states - Driver
  const [drvName, setDrvName] = useState('');
  const [drvPhone, setDrvPhone] = useState('');
  const [dlNumber, setDlNumber] = useState('');
  const [dob, setDob] = useState('');

  // Operational loading spinners
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'FLEET' | 'COMPLIANCE' | 'ASSIGNMENTS'>('FLEET');
  const [vehCursor, setVehCursor] = useState<string | null>(null);
  const [hasMoreVeh, setHasMoreVeh] = useState(false);
  const [loadingMoreVeh, setLoadingMoreVeh] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const vehData = await apiRequest('/fleet/vehicles?limit=10');
      setVehicles(vehData.vehicles || []);
      setVehCursor(vehData.nextCursor || null);
      setHasMoreVeh(Boolean(vehData.hasMore));

      const drvData = await apiRequest('/drivers');
      setDrivers(drvData.drivers || []);

      const assignData = await apiRequest('/deliveries?limit=50');
      const myVehIds = (vehData.vehicles || []).map((v: Vehicle) => v.id);
      const myDrvIds = (drvData.drivers || []).map((d: Driver) => d.id);
      const allDels: Delivery[] = assignData.deliveries || [];
      const myAssigned = allDels.filter((d: Delivery) =>
        (d.assignedVehicleId && myVehIds.includes(d.assignedVehicleId)) ||
        (d.assignedDriverId && myDrvIds.includes(d.assignedDriverId)) ||
        (!d.assignedVehicleId && ['CONFIRMED', 'DISPATCHED'].includes(d.status))
      );
      setAssignments(myAssigned);
    } catch (err) {
      console.error(err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const handleLoadMoreVehicles = async () => {
    if (!vehCursor || loadingMoreVeh) return;
    try {
      setLoadingMoreVeh(true);
      const moreData = await apiRequest(`/fleet/vehicles?limit=10&startAfter=${encodeURIComponent(vehCursor)}`);
      if (moreData.vehicles && moreData.vehicles.length > 0) {
        setVehicles((prev) => [...prev, ...moreData.vehicles]);
        setVehCursor(moreData.nextCursor || null);
        setHasMoreVeh(Boolean(moreData.hasMore));
      } else {
        setHasMoreVeh(false);
      }
    } catch (err) {
      console.error('Error loading more fleet vehicles:', err);
    } finally {
      setLoadingMoreVeh(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);

  const handleRegisterVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');

    // VAHAN Number Format verifying rule
    const vehRegex = /^[A-Z0-9]{5,11}$/;
    if (!vehRegex.test(vehNumber.toUpperCase())) {
      setError('VAHAN vehicle registration number must contain only capital alphanumeric characters (5 to 11 chars).');
      return;
    }

    try {
      const resp = await apiRequest('/fleet/vehicles', 'POST', {
        vehicleNumber: vehNumber.toUpperCase(),
        chassisNumber,
        engineNumber,
        vehicleType,
        capacityKg,
        volumeCubicCm
      });
      if (resp.success) {
        setSuccess(`Vehicle ${vehNumber.toUpperCase()} recorded into fleet inventory, VAHAN pending.`);
        setVehNumber('');
        setChassisNumber('');
        setEngineNumber('');
        setCapacityKg('');
        setVolumeCubicCm('');
        fetchData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to register fleet asset');
    }
  };

  const handleRegisterDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');

    // SARATHI format checks
    const targetDl = dlNumber.replace(/\s/g, '');
    const dlRegex = /^(([A-Z]{2}(-)[0-9]{2})|([A-Z]{2}[0-9]{2}))((19|20)[0-9][0-9])[0-9]{7}$/;
    if (!dlRegex.test(targetDl)) {
      setError('DL number format error (SARATHI verification expects standard format like GJ0420120005008).');
      return;
    }

    try {
      const resp = await apiRequest('/drivers', 'POST', {
        name: drvName,
        phone: drvPhone,
        dlNumber: targetDl,
        dob
      });
      if (resp.success) {
        setSuccess(`Driver ${drvName} registered, SARATHI pending.`);
        setDrvName('');
        setDrvPhone('');
        setDlNumber('');
        setDob('');
        fetchData();
      }
    } catch (err: any) {
      setError(err.message || 'Driver setup failed');
    }
  };

  const verifyVahanCompliance = async (id: string, number: string) => {
    setSuccess('');
    setError('');
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const resp = await apiRequest(`/fleet/vehicles/${id}/verify-vahan`, 'POST');
      if (resp.success) {
        setSuccess(`VAHAN Verify Success for ${number}! Fitness and Insurance parameters extracted completely.`);
        fetchData();
      }
    } catch (err: any) {
      setError(err.message || `VAHAN database call failed for vehicle: ${number}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const verifySarathiCompliance = async (id: string, dl: string) => {
    setSuccess('');
    setError('');
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const resp = await apiRequest(`/drivers/${id}/verify-sarathi`, 'POST');
      if (resp.success) {
        setSuccess(`SARATHI DL verify approved for license ${dl}! Commercial Transport goods endorsement active.`);
        fetchData();
      }
    } catch (err: any) {
      setError(err.message || `SARATHI database lookup failed.`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const runEChallanAudit = async (id: string, number: string) => {
    setActionLoading((prev) => ({ ...prev, [`challan_${id}`]: true }));
    try {
      const resp = await apiRequest(`/fleet/vehicles/${id}/check-echallan`, 'POST');
      if (resp.success) {
        setSuccess(`eChallan checking complete for ${number}: Pending Penalty Challans listed: ${resp.pendingChallans.length}`);
        fetchData();
      }
    } catch (err: any) {
      setError(err.message || 'eChallan verification failed.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [`challan_${id}`]: false }));
    }
  };

  const runFastagSync = async (id: string, number: string) => {
    setActionLoading((prev) => ({ ...prev, [`fastag_${id}`]: true }));
    try {
      const resp = await apiRequest(`/fleet/vehicles/${id}/check-fastag`, 'POST');
      if (resp.success) {
        setSuccess(`FASTAG balance synced successfully for vehicle ${number}.`);
        fetchData();
      }
    } catch (err: any) {
      setError(err.message || 'FASTAG endpoint error.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [`fastag_${id}`]: false }));
    }
  };

  const handleTripProgress = async (deliveryId: string, currentStatus: string) => {
    let nextStatus = 'DISPATCHED';
    if (currentStatus === 'CONFIRMED') nextStatus = 'DISPATCHED';
    else if (currentStatus === 'DISPATCHED') nextStatus = 'IN_TRANSIT';
    else if (currentStatus === 'IN_TRANSIT') nextStatus = 'DELIVERED';
    
    try {
      await apiRequest(`/deliveries/${deliveryId}/status`, 'PATCH', { status: nextStatus });
      setSuccess(`Trip progressing to milestone log status: ${nextStatus}`);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // WhatsApp FSM Simulator utility functions
  const logSimEvent = (msg: string) => {
    const timeStr = new Date().toLocaleTimeString();
    setSimAuditLogs((prev) => [`[${timeStr}] ${msg}`, ...prev]);
  };

  const handleUpdateDriverSim = async (drvId: string, updates: Partial<Driver>) => {
    try {
      const resp = await apiRequest(`/drivers/${drvId}`, 'PATCH', updates);
      if (resp.success) {
        // Refresh local drivers list
        const drvData = await apiRequest('/drivers');
        setDrivers(drvData.drivers || []);
        // Maintain active reference state
        const updatedDrv = drvData.drivers?.find((x: Driver) => x.id === drvId);
        if (updatedDrv) {
          setActiveSimDriver(updatedDrv);
        }
      }
    } catch (err) {
      console.error("Failed to update driver via API:", err);
    }
  };

  const handleOpenSimulator = (drv: Driver) => {
    setActiveSimDriver(drv);
    const initialFsmState = drv.conversationState || 'OFF_DUTY';
    
    let initialMessages: any[] = [];
    let initialAudits: string[] = [];
    const timeStr = new Date().toLocaleTimeString();

    if (initialFsmState === 'OFF_DUTY') {
      initialMessages = [
        {
          id: 'sys_1',
          sender: 'SYSTEM',
          text: '📝 System Notice: Driver is currently Off Duty. Tap "Trigger 7:00 AM Cron" check-in to start.',
          timestamp: timeStr,
        }
      ];
      initialAudits = [`[${timeStr}] FSM INITIALIZED: Driver is currently Off Duty.`];
      setSimPayloadLogs('{\n  "info": "No active outbound payload logs yet. Trigger a state transition to inspect Meta API payloads."\n}');
    } else {
      initialMessages = [
        {
          id: 'sys_1',
          sender: 'SYSTEM',
          text: `📝 System Notice: Driver conversation restored in state: ${initialFsmState}`,
          timestamp: timeStr,
        }
      ];
      initialAudits = [`[${timeStr}] FSM COLD-START RESTORED: Active state is ${initialFsmState}`];
      setSimPayloadLogs(`{\n  "info": "Conversation restored at state ${initialFsmState}. Interact with the chat simulator to view payloads."\n}`);
    }

    setSimMessages(initialMessages);
    setSimAuditLogs(initialAudits);
    setSimGeofenceAttempts(0);
    setSimTextResponse('');
    
    // Check if there is an active assigned trip for this driver, or assignable confirmed trip
    const activeTrip = assignments.find((d) => d.assignedDriverId === drv.id) ||
      assignments.find((d) => !d.assignedDriverId && ['CONFIRMED', 'DISPATCHED', 'IN_TRANSIT'].includes(d.status)) ||
      assignments[0];

    if (activeTrip) {
      const hubPick = findHub(activeTrip.pickupLocation);
      const hubDrop = findHub(activeTrip.destinationLocation);
      setSimTripDetails({
        id: activeTrip.id,
        waybill: activeTrip.ewayBillNo || `LR-${activeTrip.id.replace('del_', '')}`,
        pickup: activeTrip.pickupLocation,
        destination: activeTrip.destinationLocation,
        goods: activeTrip.goodsDescription,
        weight: activeTrip.goodsWeightKg,
        freight: activeTrip.goodsValueInr ? Math.round(activeTrip.goodsValueInr * 0.12) : 18500,
        latPickup: hubPick.lat,
        lngPickup: hubPick.lng,
        latDropoff: hubDrop.lat,
        lngDropoff: hubDrop.lng,
        status: activeTrip.status
      });
    } else {
      setSimTripDetails(null);
    }
  };

  const advanceSimState = async (
    toState: string,
    userReplyText?: string,
    gpsCoords?: { lat: number; lng: number; isOk: boolean }
  ) => {
    const timeStr = new Date().toLocaleTimeString();
    
    if (userReplyText) {
      setSimMessages(prev => [
        ...prev,
        { id: `in_${Date.now()}`, sender: 'DRIVER', text: userReplyText, timestamp: timeStr }
      ]);
      logSimEvent(`Inbound Webhook Received: Driver reply '${userReplyText}'`);
    }

    let outboundText = '';
    let buttonsToShow: { id: string; text: string }[] = [];
    let metaPayload: any = {};
    let saveState = toState;

    switch (toState) {
      case 'CHECKIN_SENT': {
        outboundText = `🟢 *FLEETR DAILY CHECK-IN* 🟢\nHello ${activeSimDriver?.name}! Welcome to the Fleetr active logistics pool. Are you ready for commercial transport freight shipping today?`;
        buttonsToShow = [
          { id: 'CHECKIN_YES', text: 'Yes, On Duty' },
          { id: 'CHECKIN_NO', text: 'No, Off Duty' }
        ];
        metaPayload = {
          messaging_product: "whatsapp",
          to: activeSimDriver?.phone.replace(/\s+/g, ''),
          type: "template",
          template: {
            name: "daily_login_checkin",
            language: { code: "en" },
            components: [
              { type: "body", parameters: [{ type: "text", text: activeSimDriver?.name }] },
              { type: "button", sub_type: "quick_reply", index: "0", parameters: [{ type: "payload", payload: "CHECKIN_YES" }] },
              { type: "button", sub_type: "quick_reply", index: "1", parameters: [{ type: "payload", payload: "CHECKIN_NO" }] }
            ]
          }
        };
        logSimEvent("FSM Triggered Daily 07:00 AM Check-In Blast broadcast.");
        break;
      }
      
      case 'AVAILABLE': {
        outboundText = `✅ *STATUS: AVAILABLE*\nYou're marked ON DUTY for today! We will notify you instantly with Waybill quote details once a shipment fits your payload capacity.`;
        metaPayload = {
          messaging_product: "whatsapp",
          to: activeSimDriver?.phone.replace(/\s+/g, ''),
          type: "text",
          text: { body: "You are on duty. Waiting for trip assignment." }
        };
        logSimEvent("FSM Transition: CHECKIN_SENT ➜ AVAILABLE. Added driver to active carrier pool.");
        break;
      }

      case 'DECLINED': {
        outboundText = `🛑 *STATUS: OFF_DUTY*\nUnderstood. We have removed you from today's freight assignment roster. Rest well!`;
        metaPayload = {
          messaging_product: "whatsapp",
          to: activeSimDriver?.phone.replace(/\s+/g, ''),
          type: "text",
          text: { body: "Off-duty status recorded." }
        };
        saveState = 'OFF_DUTY';
        logSimEvent("FSM Transition: CHECKIN_SENT ➜ DECLINED. Driver opted out today.");
        break;
      }

      case 'ASSIGNED': {
        outboundText = `JPG-LINK ➔ https://www.creative-vector.io/manifest.jpg\n\n🚛 *NEW SHIPMENT TRANSIT DETAILS* 🚛\nYou have been chosen for live consignment:
• *Waybill/LR*: ${simTripDetails?.waybill || 'LR-400921'}
• *Weight*: ${simTripDetails?.weight || 14200} kg
• *Pickup*: ${simTripDetails?.pickup || 'Mumbai Logistics Yard'}
• *Destination*: ${simTripDetails?.destination || 'Ahmedabad Godown Hub'}
• *Payout Value*: ₹${simTripDetails?.freight || 18500}

🗺️ Google Maps Routing Link to Pickup: https://maps.google.com/?q=${simTripDetails?.latPickup},${simTripDetails?.lngPickup}

Please steer your vehicle to the pickup point and tap 'Location Reached' upon arrival.`;
        buttonsToShow = [
          { id: 'LOC_REACHED', text: '📍 Location Reached' }
        ];
        metaPayload = {
          messaging_product: "whatsapp",
          to: activeSimDriver?.phone.replace(/\s+/g, ''),
          type: "interactive",
          interactive: {
            type: "button",
            header: { type: "text", text: `Assigned: ${simTripDetails?.id}` },
            body: { text: `Waybill ${simTripDetails?.waybill}\nPickup: ${simTripDetails?.pickup}\nDestination: ${simTripDetails?.destination}\nWeight: ${simTripDetails?.weight}kg` },
            footer: { text: "Fleetr Dispatch" },
            action: {
              buttons: [
                { type: "reply", reply: { id: "LOC_REACHED_" + simTripDetails?.id, title: "Location Reached" } }
              ]
            }
          }
        };
        logSimEvent(`FSM Transition: AVAILABLE ➜ ASSIGNED. Loaded trip details: ${simTripDetails?.id}`);
        break;
      }

      case 'AWAIT_PICKUP_LOCATION': {
        outboundText = `📍 *GEOFENCE VERIFICATION ENVELOPE* 📍\nPlease share your current WhatsApp live/static location. We must verify arrival inside the 500m geofence of Mumbai Logistics Yard before loading.`;
        metaPayload = {
          messaging_product: "whatsapp",
          to: activeSimDriver?.phone.replace(/\s+/g, ''),
          type: "interactive",
          interactive: {
            type: "location_request_message",
            body: { text: "Please share coordinate parameters to verify warehouse arrival." },
            action: { name: "send_location" }
          }
        };
        logSimEvent("FSM Transition: ASSIGNED ➜ AWAIT_PICKUP_LOCATION. Awaiting GPS coords.");
        break;
      }

      case 'PICKUP_VERIFYING': {
        if (gpsCoords) {
          logSimEvent(`GPS coordinate received: Lat ${gpsCoords.lat}, Lng ${gpsCoords.lng}`);
          if (gpsCoords.isOk) {
            outboundText = `✅ *PICKUP GEOFENCE VERIFIED* ✅\nSuccess! Your GPS coordinates match Mumbai Logistics Yard (distance is 112m). Warehouse supervisor notified, loading commences physically!`;
            metaPayload = {
              messaging_product: "whatsapp",
              to: activeSimDriver?.phone.replace(/\s+/g, ''),
              type: "text",
              text: { body: "Geofence verified. Loading started is recorded." }
            };
            saveState = 'LOADING';
            logSimEvent("GPS check PASSED. FSM Transition: AWAIT_PICKUP_LOCATION ➜ LOADING.");
          } else {
            const nextAttempt = simGeofenceAttempts + 1;
            setSimGeofenceAttempts(nextAttempt);
            if (nextAttempt >= 3) {
              outboundText = `🚨 *GEOFENCE VERIFICATION EXCEEDED ATTEMPTS* 🚨\nWe failed to verify your position within 500m of the warehouse after 3 attempts. Transit security alert dispatched to administrative dashboard.`;
              metaPayload = {
                messaging_product: "whatsapp",
                to: activeSimDriver?.phone.replace(/\s+/g, ''),
                type: "text",
                text: { body: "verification failed 3 times. Escalated to Fleet Admin." }
              };
              saveState = 'OFF_DUTY';
              logSimEvent(`🚨 ALERT: GPS verify failed 3 times for ${activeSimDriver?.name}. ESCALATED TO FLT_ADMIN.`);
            } else {
              outboundText = `❌ *GEOFENCE CHECK OUT-OF-BOUNDS* ❌\nCoordinates do NOT match Mumbai Logistics Yard (distance calculated is 4.8km). Make sure you are inside the yard and share location again. (Attempt ${nextAttempt}/3)`;
              metaPayload = {
                messaging_product: "whatsapp",
                to: activeSimDriver?.phone.replace(/\s+/g, ''),
                type: "text",
                text: { body: "Out of bounds coordinate." }
              };
              saveState = 'AWAIT_PICKUP_LOCATION';
              logSimEvent(`GPS check FAILED (Attempt ${nextAttempt}/3). Driver is 4,812 meters outside geofence boundary.`);
            }
          }
        }
        break;
      }

      case 'LOADING': {
        outboundText = `⌛ *CARGO LOADING IN PROGRESS* ⌛\nYour cargo weight is being audited and tied down. Please wait for the physical loading manifest signature confirmation.`;
        metaPayload = { "status_waiting": "cargo_loading" };
        logSimEvent("FSM State: LOADING. Waiting for warehouse operators.");
        break;
      }

      case 'DISPATCH_SENT': {
        if (simTripDetails?.id) {
          apiRequest(`/deliveries/${simTripDetails.id}/status`, 'PATCH', { status: 'DISPATCHED' })
            .then(() => fetchData())
            .catch(console.error);
        }
        outboundText = `📦 *CARGO SEALED & TRAN-ROUTE ISSUED* 📦\nVehicle loaded! Google Maps Route Navigation Link: https://www.google.com/maps/dir/?api=1&origin=${simTripDetails?.latPickup},${simTripDetails?.lngPickup}&destination=${simTripDetails?.latDropoff},${simTripDetails?.lngDropoff}

Please tap 'Confirm Dispatch' before you roll your wheels today. Safe high-speed transit!`;
        buttonsToShow = [
          { id: 'CONFIRM_DISPATCH', text: '🚀 Confirm Dispatch' }
        ];
        metaPayload = {
          messaging_product: "whatsapp",
          to: activeSimDriver?.phone.replace(/\s+/g, ''),
          type: "interactive",
          interactive: {
            type: "button",
            body: { text: "Loading completed. Please click Confirm Dispatch to start route tracking." },
            action: {
              buttons: [{ type: "reply", reply: { id: "CONF_DISPATCH_" + simTripDetails?.id, title: "Confirm Dispatch" } }]
            }
          }
        };
        logSimEvent(`FSM Transition: LOADING ➜ DISPATCH_SENT. Shipment ${simTripDetails?.id} marked DISPATCHED.`);
        break;
      }

      case 'IN_TRANSIT': {
        if (simTripDetails?.id) {
          apiRequest(`/deliveries/${simTripDetails.id}/status`, 'PATCH', { status: 'IN_TRANSIT' })
            .then(() => fetchData())
            .catch(console.error);
        }
        outboundText = `🛣️ *SHIPMENT IN TRANSIT* 🛣️\nTransit logging active. Drive alert and safe!
• *Destination*: ${simTripDetails?.destination}
• *Live Corridors*: NH National Corridor active
• *Emergency Line (SOS)*: Call 112 / +91-9999911002

🏁 Tap 'Delivery Completed' as soon as you reach the destination dropoff coordinates.`;
        buttonsToShow = [
          { id: 'DELIVERY_COMPLETED', text: '🏁 Delivery Completed' }
        ];
        metaPayload = {
          messaging_product: "whatsapp",
          to: activeSimDriver?.phone.replace(/\s+/g, ''),
          type: "interactive",
          interactive: {
            type: "button",
            body: { text: "Live transit GPS tracking active. Click Delivery Completed on destination arrival." },
            action: {
              buttons: [{ type: "reply", reply: { id: "DELIV_DONE_" + simTripDetails?.id, title: "Delivery Completed" } }]
            }
          }
        };
        logSimEvent(`FSM Transition: DISPATCH_SENT ➜ IN_TRANSIT. Shipment ${simTripDetails?.id} marked IN_TRANSIT.`);
        break;
      }

      case 'AWAIT_DELIVERY_LOCATION': {
        outboundText = `📍 *DELIVERY ARRIVAL SIGN-OFF* 📍\nPlease share your current coordinates. We must check destination geofence matches ${simTripDetails?.destination || 'dropoff facility'} (500m radius) before payload release approval.`;
        metaPayload = {
          messaging_product: "whatsapp",
          to: activeSimDriver?.phone.replace(/\s+/g, ''),
          type: "interactive",
          interactive: {
            type: "location_request_message",
            body: { text: "Please share delivery coordinates." },
            action: { name: "send_location" }
          }
        };
        logSimEvent("FSM Transition: IN_TRANSIT ➜ AWAIT_DELIVERY_LOCATION. Waiting on dropoff GPS coordinates.");
        break;
      }

      case 'DELIVERY_VERIFYING': {
        if (gpsCoords) {
          logSimEvent(`GPS coordinate received: Lat ${gpsCoords.lat}, Lng ${gpsCoords.lng}`);
          if (gpsCoords.isOk) {
            outboundText = `🎉 *DELIVERY ARRIVAL VERIFIED* 🎉\nLocation confirmed inside ${simTripDetails?.destination || 'Destination Hub'}. Delivery ${simTripDetails?.id} successfully marked DELIVERED! Restoring vehicle availability...`;
            metaPayload = {
              messaging_product: "whatsapp",
              to: activeSimDriver?.phone.replace(/\s+/g, ''),
              type: "text",
              text: { body: "Delivery verified. Payout compilation triggered." }
            };
            saveState = 'PAYOUT_PENDING';
            logSimEvent(`FSM Transition: AWAIT_DELIVERY_LOCATION ➜ DELIVERED ➜ PAYOUT_PENDING.`);
            
            if (simTripDetails?.id) {
              try {
                await apiRequest(`/deliveries/${simTripDetails.id}/status`, 'PATCH', { status: 'DELIVERED' });
                fetchData();
              } catch (e) {
                console.error("Failed to update delivery object in DB:", e);
              }
            }
          } else {
            const nextAttempt = simGeofenceAttempts + 1;
            setSimGeofenceAttempts(nextAttempt);
            if (nextAttempt >= 3) {
              outboundText = `🚨 *DELIVERY GEOFENCE TIMEOUT* 🚨\nDropoff location coordinates verify out of range. Requesting cargo inspection clearance manually.`;
              metaPayload = { "alert": "manually_payout" };
              saveState = 'OFF_DUTY';
              logSimEvent(`🚨 Drop geofence verify failed 3 times. Offloaded to fleet control supervisor.`);
            } else {
              outboundText = `❌ *GEOFENCE DISCREPANCY DETECTED* ❌\nCoordinates do NOT match destination geofence radius. Please stand inside the unloading yard and share GPS position again. (Attempt ${nextAttempt}/3)`;
              metaPayload = { "distance_fail": "re_verify" };
              saveState = 'AWAIT_DELIVERY_LOCATION';
              logSimEvent(`GPS drop check FAILED (Attempt ${nextAttempt}/3). Outside destination fence.`);
            }
          }
        }
        break;
      }

      case 'PAYOUT_PENDING': {
        outboundText = `⏳ *RAZORPAYX IMPS PAYOUT QUEUED* ⏳\nProof of delivery accepted. Direct IMPS transfer has been scheduled/queued. Settlement typically routes in 10-60 minutes.`;
        metaPayload = { "queue": "RazorpayX IMPS payout", "idempotency_key": simTripDetails?.id };
        logSimEvent("FSM State: PAYOUT_PENDING. Compiling RazorpayX payload disbursement parameters.");
        break;
      }

      case 'PAID': {
        outboundText = `💰 *FREIGHT PAYOUT TRANSFERRED* 💰
Direct IMPS payout settled successfully into your registered bank account!
• *Carrier Charge settled*: ₹${simTripDetails?.freight || 18500}
• *UTR Transaction ID*: rxp_IMPS_${Math.floor(100000 + Math.random() * 900000)}
• *Method*: RazorpayX Instant IMPS

Thank you for driving with Fleetr! Click 'Proceed' to check for return cargo loads.`;
        buttonsToShow = [
          { id: 'PROCEED_RETURN_CHECK', text: 'Proceed to Return Check' }
        ];
        metaPayload = {
          messaging_product: "whatsapp",
          to: activeSimDriver?.phone.replace(/\s+/g, ''),
          type: "text",
          text: { body: "Freight payout settled successfully." }
        };
        logSimEvent(`RazorpayX webhook callback processing successful. Transaction settled. UTR generated.`);
        break;
      }

      case 'RETURN_CHECK': {
        logSimEvent("Querying active database for pending return consignments...");
        try {
          const retResp = await apiRequest(`/deliveries/return-trips?currentCity=${encodeURIComponent(simTripDetails?.destination || '')}`);
          const candidate = retResp.candidates?.[0];
          if (candidate) {
            outboundText = `🔄 *REAL RETURN FREIGHT FOUND: ${candidate.id}* 🔄
An active return consignment is awaiting carrier dispatch from ${candidate.pickupLocation}:
• *Cargo*: ${candidate.goodsDescription} (${candidate.goodsWeightKg} kg)
• *Destination*: ${candidate.destinationLocation}
• *Waybill*: ${candidate.ewayBillNo}

Do you wish to accept this return haul?`;
            buttonsToShow = [
              { id: 'ACCEPT_REAL_RETURN', text: '🔄 Accept Real Return Load' },
              { id: 'OFF_DUTY_CLOSE', text: '🛑 Decline & Conclude Duty' }
            ];
          } else {
            outboundText = `🔄 *RETURN FREIGHT POOL: EMPTY* 🔄\nNo active return shipments currently waiting from ${simTripDetails?.destination || 'destination area'}. Transit complete! Driver scheduled for off-duty rest.`;
            buttonsToShow = [
              { id: 'OFF_DUTY_CLOSE', text: '🛑 Conclude Duty Session' }
            ];
          }
        } catch {
          outboundText = `🔄 *RETURN FREIGHT POOL* 🔄\nNo active return shipments currently waiting. Transit complete! Driver scheduled for off-duty rest.`;
          buttonsToShow = [
            { id: 'OFF_DUTY_CLOSE', text: '🛑 Conclude Duty Session' }
          ];
        }
        break;
      }

      case 'LOOP_BACK_STATE_5':
      case 'ACCEPT_REAL_RETURN': {
        const retResp = await apiRequest(`/deliveries/return-trips?currentCity=${encodeURIComponent(simTripDetails?.destination || '')}`).catch(() => null);
        const cand = retResp?.candidates?.[0];
        if (cand) {
          const hubP = findHub(cand.pickupLocation);
          const hubD = findHub(cand.destinationLocation);
          setSimTripDetails({
            id: cand.id,
            waybill: cand.ewayBillNo || `LR-${cand.id.replace('del_', '')}`,
            pickup: cand.pickupLocation,
            destination: cand.destinationLocation,
            goods: cand.goodsDescription,
            weight: cand.goodsWeightKg,
            freight: cand.goodsValueInr ? Math.round(cand.goodsValueInr * 0.12) : 16000,
            latPickup: hubP.lat,
            lngPickup: hubP.lng,
            latDropoff: hubD.lat,
            lngDropoff: hubD.lng,
            status: cand.status
          });
          outboundText = `🔄 *RETURN CONSIGNMENT ASSIGNED: ${cand.id}* 🔄
• *Cargo*: ${cand.goodsDescription}
• *Weight*: ${cand.goodsWeightKg} kg
• *Pickup*: ${cand.pickupLocation}
• *Destination*: ${cand.destinationLocation}
• *Waybill*: ${cand.ewayBillNo}

Proceed to the loading bay and tap 'Location Reached' upon cargo load arrival.`;
          buttonsToShow = [
            { id: 'LOC_REACHED', text: '📍 Location Reached' }
          ];
          saveState = 'ASSIGNED';
          logSimEvent(`Assigned real return shipment ${cand.id} to driver ${activeSimDriver?.name}`);
        } else {
          outboundText = `📴 No active return cargo available. Rest period initiated.`;
          saveState = 'OFF_DUTY';
        }
        break;
      }

      case 'OFF_DUTY_CLOSE': {
        outboundText = `📴 *COMMUNICATION ENVELOPE CLOSED* 📴\nNo return loads found today. Transit complete, off-duty rest mode successfully restored. Safe travels!`;
        metaPayload = { "envelope": "closed" };
        saveState = 'OFF_DUTY';
        logSimEvent("FSM Transition: RETURN_CHECK ➜ OFF_DUTY. Session closed successfully.");
        updateDeliveryStatus(simTripDetails?.id, 'TRIP_DONE');
        break;
      }

      default:
        break;
    }

    if (outboundText) {
      setTimeout(() => {
        setSimMessages(prev => [
          ...prev,
          {
            id: `out_${Date.now()}`,
            sender: 'FLEETR',
            text: outboundText,
            timestamp: new Date().toLocaleTimeString(),
            buttons: buttonsToShow
          }
        ]);
        setSimPayloadLogs(JSON.stringify(metaPayload, null, 2));
      }, 700);

      // Trigger actual outbound WhatsApp dispatch via backend API route
      if (activeSimDriver && activeSimDriver.phone) {
        apiRequest('/whatsapp/send', 'POST', {
          phone: activeSimDriver.phone,
          text: outboundText
        }).then((res) => {
          if (res && res.success && !res.isMock) {
            logSimEvent(`[WhatsApp Gateway] Successfully sent real outbound message payload to +${activeSimDriver.phone}`);
          } else if (res && res.isMock) {
            logSimEvent(`[WhatsApp Gateway Fallback] Simulated channel logs. API credentials pending configuration in .env.`);
          }
        }).catch((err) => {
          console.error("Outbound WhatsApp integration request failed:", err);
        });
      }
    }

    if (activeSimDriver) {
      await handleUpdateDriverSim(activeSimDriver.id, { conversationState: saveState });
    }
  };

  const updateDeliveryStatus = async (tripId: string | undefined, finalStatus: string) => {
    if (tripId && !tripId.startsWith('GTN-TRIP')) {
       try {
         await apiRequest(`/deliveries/${tripId}/status`, 'PATCH', { status: finalStatus });
         fetchData();
       } catch (err) {
         console.error(err);
       }
    }
  };

  const handleSendSimFreeText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simTextResponse.trim()) return;
    const txt = simTextResponse;
    setSimTextResponse('');

    setSimMessages(prev => [
      ...prev,
      { id: `in_free_${Date.now()}`, sender: 'DRIVER', text: txt, timestamp: new Date().toLocaleTimeString() }
    ]);
    logSimEvent(`Driver sent free-text message: "${txt}"`);

    setTimeout(() => {
      const nudgeText = `⚠️ *AUTO-NUDGE ASSISTANT* ⚠️\nHello! I didn't quite get that. Please use the interactive quick-reply buttons on the message above, or use the menu items to proceed. Free-text inputs are not processed automatically by our auto-router.`;
      setSimMessages(prev => [
        ...prev,
        {
          id: `out_nudge_${Date.now()}`,
          sender: 'FLEETR',
          text: nudgeText,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
      setSimPayloadLogs(JSON.stringify({
        "info": "Free-text input nudge response",
        "input_message": txt,
        "nudge": "Please tap buttons or share coordinates."
      }, null, 2));
    }, 600);
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [simMessages]);

  if (activeSimDriver) {
    const statusColorMap: Record<string, string> = {
      OFF_DUTY: 'bg-slate-100 text-slate-600 border border-slate-200',
      CHECKIN_SENT: 'bg-sky-50 text-sky-600 border border-sky-200 animate-pulse',
      AVAILABLE: 'bg-emerald-50 text-emerald-750 border border-emerald-250',
      DECLINED: 'bg-amber-50 text-amber-600 border border-amber-250',
      ASSIGNED: 'bg-indigo-50 text-indigo-700 border border-indigo-250',
      AWAIT_PICKUP_LOCATION: 'bg-cyan-50 text-cyan-700 border border-cyan-250 animate-pulse',
      LOADING: 'bg-amber-50 text-amber-700 border border-amber-250',
      DISPATCH_SENT: 'bg-violet-50 text-violet-700 border border-violet-200',
      IN_TRANSIT: 'bg-purple-100 text-purple-700 border border-purple-200',
      AWAIT_DELIVERY_LOCATION: 'bg-cyan-50 text-cyan-700 border border-cyan-250 animate-pulse',
      DELIVERED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      PAYOUT_PENDING: 'bg-orange-50 text-orange-700 border border-orange-200 animate-pulse',
      PAID: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
      RETURN_CHECK: 'bg-sky-50 text-sky-700 border border-sky-200'
    };
    const currentFsmState = activeSimDriver.conversationState || 'OFF_DUTY';
    const activeStateClass = statusColorMap[currentFsmState] || statusColorMap.OFF_DUTY;

    const fsmSequentialStates = [
      { code: 'OFF_DUTY', num: 1, label: 'Off Duty', desc: 'Driver is inactive/idle.' },
      { code: 'CHECKIN_SENT', num: 2, label: 'Daily Check-In Sent', desc: 'Outbound 07:00 template sent.' },
      { code: 'AVAILABLE', num: 3, label: 'Available / On Duty', desc: 'Awaiting cargo allocation.' },
      { code: 'ASSIGNED', num: 5, label: 'Trip Assigned', desc: 'Allotted route quote details.' },
      { code: 'AWAIT_PICKUP_LOCATION', num: 6, label: 'Awaiting Pickup GPS', desc: 'Requested location check.' },
      { code: 'LOADING', num: 9, label: 'Loading Cargo', desc: 'Truck is being hoisted/secured.' },
      { code: 'DISPATCH_SENT', num: 10, label: 'Dispatch Pending', desc: 'Loaded, awaiting start click.' },
      { code: 'IN_TRANSIT', num: 11, label: 'In Transit', desc: 'Live GPS route tracking active.' },
      { code: 'AWAIT_DELIVERY_LOCATION', num: 12, label: 'Awaiting Delivery GPS', desc: 'Requested arrival check.' },
      { code: 'DELIVERED', num: 14, label: 'Delivered', desc: 'Arrival verified within geofence.' },
      { code: 'PAYOUT_PENDING', num: 15, label: 'Payout Queue', desc: 'Virtual RazorpayX pending IMPS.' },
      { code: 'PAID', num: 16, label: 'Settled Payout', desc: 'Disbursement completed successfully.' },
      { code: 'RETURN_CHECK', num: 17, label: 'Return Trip Check', desc: 'Scanning for back-load.' },
    ];

    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 bg-white p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 text-white p-2 rounded-lg">
              <Smartphone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-widest font-mono">Truck Driver WhatsApp Integration Workspace</h2>
              <p className="text-[10px] text-slate-400 font-medium font-mono mt-0.5">MOCK DEV TESTING ENGINE FOR META WEBHOOK STATE MACHINE</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-mono font-bold rounded-lg border border-emerald-100">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              MOCK_WHATSAPP=true
            </span>
            <button
              onClick={() => {
                setActiveSimDriver(null);
                fetchData();
              }}
              className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Fleet Logbook
            </button>
          </div>
        </div>

        {/* Outer Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (7 cols): FSM timeline tracker, console triggers, and logs */}
          <div className="lg:col-span-7 space-y-6 flex flex-col">
            
            {/* Driver Profile Header */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600 font-mono text-sm uppercase">
                  {activeSimDriver.name.slice(0, 2)}
                </div>
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-800 font-display">{activeSimDriver.name}</h3>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">DL No: {activeSimDriver.dlNumber} | DOB: {activeSimDriver.dob}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-1 rounded text-[9px] font-mono font-bold ${activeStateClass}`}>
                  STAGE: {currentFsmState}
                </span>
                <span className="px-2 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded text-[9px] font-bold">
                  OPT-IN: Verified
                </span>
                <span className={`px-2 py-1 rounded text-[9px] font-bold ${activeSimDriver.sarathiVerified ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600'}`}>
                  {activeSimDriver.sarathiVerified ? 'SARATHI Verified' : 'Pending Sarathi'}
                </span>
              </div>
            </div>

            {/* Active Assignment / Shipment Context */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest font-mono">Freight Consignment Context</h4>
                <span className="text-[9px] font-mono px-2 py-0.5 bg-slate-100 text-slate-500 rounded font-bold">
                  Trip ID: {simTripDetails?.id}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg font-mono">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Waybill EwayBillNo</span>
                  <span className="text-slate-800 font-bold text-[11px]">{simTripDetails?.waybill}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Payout Value (Freight)</span>
                  <span className="text-slate-800 font-bold text-[11px]">₹{simTripDetails?.freight?.toLocaleString()}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Route Path</span>
                  <span className="text-slate-800 font-bold text-[11px] flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-500" />
                    {simTripDetails?.pickup}
                    <span className="text-slate-300">➔</span>
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    {simTripDetails?.destination}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Commodity Load</span>
                  <span className="text-slate-800 font-bold text-[11px]">{simTripDetails?.goods} ({simTripDetails?.weight?.toLocaleString()} kg)</span>
                </div>
                {simTripDetails?.returnOfTripId && (
                  <div className="col-span-2 bg-indigo-50 border border-indigo-150 p-2 rounded text-[10px] text-indigo-700 font-semibold font-sans">
                    🔄 Return Load Cycle: This shipment is linked to return_of_trip_id [{simTripDetails.returnOfTripId}].
                  </div>
                )}
              </div>
            </div>

            {/* FSM Progress Timeline Tracker */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest font-mono">17-State FSM Position Tracker</h4>
              <div className="space-y-4 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                {fsmSequentialStates.map((st) => {
                  const isCurrent = currentFsmState === st.code;
                  return (
                    <div
                      key={st.code}
                      className={`p-3 rounded-lg border transition-all flex items-start gap-3 ${
                        isCurrent
                          ? 'bg-emerald-50/70 border-emerald-300 shadow-sm ring-1 ring-emerald-300'
                          : 'bg-white border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center font-mono text-[9px] font-extrabold ${
                        isCurrent
                          ? 'bg-emerald-600 text-white animate-pulse'
                          : 'bg-slate-150 text-slate-500'
                      }`}>
                        {st.num}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-[11px] font-extrabold ${isCurrent ? 'text-emerald-950 font-mono' : 'text-slate-700'}`}>
                            {st.label}
                          </span>
                          {isCurrent && (
                            <span className="text-[8px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded font-mono uppercase tracking-widest animate-pulse inline-block">
                              Active State
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{st.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Physical System & Webhook Controller Simulator */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest font-mono">System Operator & Integration Webhook Triggers</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Use these buttons to simulate operations that would physically occur at the warehouses, razorpayx virtual gateways or scheduling crons.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Cron check-in button */}
                <button
                  disabled={currentFsmState !== 'OFF_DUTY'}
                  onClick={() => advanceSimState('CHECKIN_SENT')}
                  className={`p-3 border rounded-xl font-mono text-left space-y-1.5 transition-all text-xs cursor-pointer ${
                    currentFsmState === 'OFF_DUTY'
                      ? 'border-sky-300 bg-sky-50 text-sky-850 hover:bg-sky-100 shadow-sm'
                      : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    7:00 AM Cron Blast
                  </div>
                  <p className="text-[9px] font-normal text-slate-400">Simulates daily 07:00 check-in cron push message targeting all contracted drivers.</p>
                </button>

                {/* Mark loader completed */}
                <button
                  disabled={currentFsmState !== 'LOADING'}
                  onClick={() => advanceSimState('DISPATCH_SENT')}
                  className={`p-3 border rounded-xl font-mono text-left space-y-1.5 transition-all text-xs cursor-pointer ${
                    currentFsmState === 'LOADING'
                      ? 'border-violet-300 bg-violet-50 text-violet-850 hover:bg-violet-100 shadow-sm'
                      : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    <Layers className="w-3.5 h-3.5" />
                    Complete Loading
                  </div>
                  <p className="text-[9px] font-normal text-slate-400">Simulates physical cargo hoisting finished at the warehouse. Signs and fires outbound route maps.</p>
                </button>

                {/* RazorpayX webhook virtual processed */}
                <button
                  disabled={currentFsmState !== 'PAYOUT_PENDING'}
                  onClick={() => advanceSimState('PAID')}
                  className={`p-3 border rounded-xl font-mono text-left space-y-1.5 transition-all text-xs cursor-pointer ${
                    currentFsmState === 'PAYOUT_PENDING'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-850 hover:bg-emerald-100 shadow-sm'
                      : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    <CreditCard className="w-3.5 h-3.5" />
                    RazorpayX Webhook
                  </div>
                  <p className="text-[9px] font-normal text-slate-400">Simulates receipt of payout_processed event. Settles IMPS transaction in database.</p>
                </button>
              </div>
            </div>

            {/* Diagnostic Console Telemetry Logs */}
            <div className="bg-slate-900 border border-slate-950 p-5 rounded-xl shadow-inner space-y-3 font-mono">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse inline-block"></span>
                  Fleetr FSM Diagnostic Audit console
                </div>
                <button
                  onClick={() => setSimAuditLogs([])}
                  className="text-[9px] text-slate-500 hover:text-slate-300 uppercase tracking-widest font-bold font-mono"
                >
                  Clear Feed
                </button>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg text-[10px] text-emerald-400 overflow-y-auto max-h-40 h-40 space-y-1.5 font-mono">
                {simAuditLogs.length === 0 ? (
                  <span className="text-slate-600 block font-mono">[System idle. Waiting for event progression log logs...]</span>
                ) : (
                  simAuditLogs.map((log, index) => (
                    <div key={index} className="leading-relaxed whitespace-pre-wrap font-mono">{log}</div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Right Column (5 cols): Phone Screen simulator + Meta Payload output */}
          <div className="lg:col-span-12 xl:col-span-5 space-y-6 flex flex-col items-center">
            
            {/* The Smart Device Phone Shell */}
            <div className="w-full max-w-[360px] h-[640px] bg-slate-950 rounded-[40px] border-[11px] border-slate-900 shadow-2xl relative overflow-hidden flex flex-col outline outline-1 outline-slate-800">
              {/* Speaker Bezel */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-30 flex items-center justify-center gap-1">
                <div className="w-1.5 h-1.5 bg-slate-800 rounded-full"></div>
                <div className="w-12 h-1 bg-slate-800 rounded-full"></div>
              </div>

              {/* Status Bar */}
              <div className="bg-emerald-800 pt-6 px-5 pb-1 flex justify-between items-center text-[10px] text-white font-mono z-20 font-bold">
                <span>09:41</span>
                <div className="flex items-center gap-1.5">
                  <span>5G</span>
                  <span>📶</span>
                  <span>🔋 94%</span>
                </div>
              </div>

              {/* WhatsApp App Bar */}
              <div className="bg-emerald-800 text-white px-4 py-2.5 flex items-center gap-2 shadow-md z-20 border-b border-emerald-950">
                <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-emerald-800 font-extrabold text-md border-2 border-white">
                  F
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold leading-none block overflow-hidden text-ellipsis whitespace-nowrap">Fleetr Dispatches</span>
                    <span className="text-[10px] text-emerald-300">✓</span>
                  </div>
                  <span className="text-[8px] text-emerald-100 font-mono font-medium mt-0.5 block">Official Business API Account</span>
                </div>
                <div className="text-[13px] opacity-80 gap-3 flex">
                  <PhoneCall className="w-4 h-4 cursor-pointer" />
                  <span>⋮</span>
                </div>
              </div>

              {activeSimDriver && (
                <div className="bg-emerald-50 border-b border-emerald-100 px-3 py-1.5 flex items-center justify-between text-[10px] text-emerald-950 z-10 shadow-sm shrink-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block animate-pulse shrink-0"></span>
                    <span className="truncate font-medium">To driver: <b className="font-mono">{activeSimDriver.phone}</b></span>
                  </div>
                  <a
                    href={`https://wa.me/${activeSimDriver.phone.replace(/[+\s-]/g, '')}?text=${encodeURIComponent(
                      `Hello ${activeSimDriver.name}! This is the Fleetr dispatcher. We have registered and verified your SARATHI DL credential container. Standing by to assign freight dispatches...`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white py-0.5 px-2 rounded-md font-bold uppercase text-[8px] tracking-wider inline-flex items-center gap-1 shrink-0 transition-opacity"
                  >
                    💬 Direct Link
                  </a>
                </div>
              )}

              {/* Chat Viewport Area */}
              <div className="flex-1 bg-[#efeae2] p-4 overflow-y-auto space-y-4 flex flex-col relative" style={{ backgroundImage: "radial-gradient(rgba(0,0,0,0.03) 1px, transparent 0)", backgroundSize: "16px 16px" }}>
                
                {simMessages.map((msg) => {
                  if (msg.sender === 'SYSTEM') {
                    return (
                      <div key={msg.id} className="self-center bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-[9px] font-bold font-mono tracking-wide max-w-[90%] text-center border border-slate-300 shadow-sm leading-relaxed">
                        {msg.text}
                      </div>
                    );
                  }

                  const isOutbound = msg.sender === 'FLEETR' || msg.sender === 'GATI_NODE';

                  return (
                    <div key={msg.id} className={`max-w-[85%] flex flex-col gap-1.5 ${isOutbound ? 'self-start' : 'self-end'}`}>
                      <div className={`p-3 rounded-2xl text-[11px] leading-relaxed relative ${
                        isOutbound
                          ? 'bg-white text-slate-800 shadow-sm rounded-tl-none border border-slate-100'
                          : 'bg-[#d9fdd3] text-slate-800 shadow-sm rounded-tr-none'
                      }`}>
                        
                        {/* Render images if link matches */}
                        {msg.text.includes('JPG-LINK') ? (
                          <div className="space-y-2">
                            <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-100">
                              <img
                                referrerPolicy="no-referrer"
                                src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=400"
                                alt="Manifest E-Way Bill"
                                className="w-full h-24 object-cover"
                              />
                              <div className="bg-slate-50 p-2 text-[9px] font-mono text-slate-500 border-t border-slate-150">
                                📋 Waybill manifest.jpg (E-Way Approved)
                              </div>
                            </div>
                            <div className="whitespace-pre-wrap">{msg.text.replace('JPG-LINK ➔ https://www.creative-vector.io/manifest.jpg\n\n', '')}</div>
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap font-sans">{msg.text}</div>
                        )}

                        <span className="text-[8px] text-slate-400 block text-right mt-1 font-mono font-medium">
                          {msg.timestamp} {isOutbound && '✓✓'}
                        </span>
                      </div>

                      {/* Outbound interactive buttons inside chat bubble */}
                      {isOutbound && msg.buttons && msg.buttons.length > 0 && (
                        <div className="grid grid-cols-1 gap-1.5 self-stretch">
                          {msg.buttons.map((btn: any) => {
                            let isDisabled = false;
                            
                            // Guard buttons status according to FSM state
                            if (btn.id === 'CHECKIN_YES' || btn.id === 'CHECKIN_NO') {
                              isDisabled = currentFsmState !== 'CHECKIN_SENT';
                            } else if (btn.id === 'LOC_REACHED') {
                              isDisabled = currentFsmState !== 'ASSIGNED';
                            } else if (btn.id === 'CONFIRM_DISPATCH') {
                              isDisabled = currentFsmState !== 'DISPATCH_SENT';
                            } else if (btn.id === 'DELIVERY_COMPLETED') {
                              isDisabled = currentFsmState !== 'IN_TRANSIT';
                            } else if (btn.id === 'PROCEED_RETURN_CHECK') {
                              isDisabled = currentFsmState !== 'PAID';
                            } else if (btn.id === 'ACCEPT_RETURN_LOAD' || btn.id === 'DECLINE_RETURN_LOAD') {
                              isDisabled = currentFsmState !== 'RETURN_CHECK';
                            }

                            return (
                              <button
                                key={btn.id}
                                disabled={isDisabled}
                                onClick={() => {
                                  if (btn.id === 'CHECKIN_YES') advanceSimState('AVAILABLE', 'Yes, On Duty');
                                  else if (btn.id === 'CHECKIN_NO') advanceSimState('DECLINED', 'No, Off Duty');
                                  else if (btn.id === 'LOC_REACHED') advanceSimState('AWAIT_PICKUP_LOCATION', '📍 Location Reached');
                                  else if (btn.id === 'CONFIRM_DISPATCH') advanceSimState('IN_TRANSIT', '🚀 Confirm Dispatch');
                                  else if (btn.id === 'DELIVERY_COMPLETED') advanceSimState('AWAIT_DELIVERY_LOCATION', '🏁 Delivery Completed');
                                  else if (btn.id === 'PROCEED_RETURN_CHECK') advanceSimState('RETURN_CHECK', 'Proceed to Payout Check');
                                  else if (btn.id === 'ACCEPT_RETURN_LOAD') advanceSimState('LOOP_BACK_STATE_5', '🔄 Accept Return Load');
                                  else if (btn.id === 'DECLINE_RETURN_LOAD') advanceSimState('OFF_DUTY_CLOSE', '🛑 No Return Load (Go Off-Duty)');
                                }}
                                className={`w-full py-2 px-3 rounded-lg text-[10px] font-extrabold uppercase tracking-wide shadow-sm font-sans text-center transition-all cursor-pointer ${
                                  isDisabled
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50 border border-slate-155'
                                    : 'bg-white text-emerald-700 hover:bg-emerald-50 active:scale-[0.98] border border-slate-200 ring-1 ring-emerald-500/25'
                                }`}
                              >
                                {btn.text}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Simulated Geofence GPS Picker popover */}
                {(currentFsmState === 'AWAIT_PICKUP_LOCATION' || currentFsmState === 'AWAIT_DELIVERY_LOCATION') && (
                  <div className="bg-slate-900 border border-slate-950 p-3 rounded-xl shadow-xl space-y-2 mt-auto animate-in slide-in-from-bottom-5 z-20">
                    <span className="block text-[9px] font-bold text-slate-300 font-mono uppercase tracking-widest text-center flex items-center justify-center gap-1.5 border-b border-slate-800 pb-1.5 mb-1 text-center font-mono">
                      <Compass className="w-3 h-3 text-cyan-400 animate-spin" />
                      Simulated GPS Attachment Picker
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-[9px] font-bold font-mono">
                      <button
                        onClick={() => {
                          const isPickup = currentFsmState === 'AWAIT_PICKUP_LOCATION';
                          const lat = isPickup ? 19.123 : 23.013;
                          const lng = isPickup ? 72.893 : 72.588;
                          const targetState = isPickup ? 'PICKUP_VERIFYING' : 'DELIVERY_VERIFYING';
                          advanceSimState(targetState, `📍 GPS Shared (Verify OK: Lat ${lat}, Lng ${lng})`, { lat, lng, isOk: true });
                        }}
                        className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 text-center active:scale-95 transition-all cursor-pointer"
                      >
                        📍 Within Geofence (FSM Pass)
                      </button>
                      <button
                        onClick={() => {
                          const isPickup = currentFsmState === 'AWAIT_PICKUP_LOCATION';
                          const lat = isPickup ? 19.155 : 23.099;
                          const lng = isPickup ? 72.852 : 72.499;
                          const targetState = isPickup ? 'PICKUP_VERIFYING' : 'DELIVERY_VERIFYING';
                          advanceSimState(targetState, `📍 GPS Shared (Verify Error: Lat ${lat}, Lng ${lng})`, { lat, lng, isOk: false });
                        }}
                        className="p-2 bg-rose-700 text-white rounded-lg hover:bg-rose-600 text-center active:scale-95 transition-all cursor-pointer"
                      >
                        📍 Out of Bounds (FSM Fail)
                      </button>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Backing Chat Input Bar */}
              <form onSubmit={handleSendSimFreeText} className="bg-slate-100 p-2.5 flex items-center gap-2 border-t border-slate-200 z-10">
                <input
                  type="text"
                  value={simTextResponse}
                  onChange={(e) => setSimTextResponse(e.target.value)}
                  placeholder="Type message to test Nudge..."
                  className="flex-1 bg-white border border-slate-200 rounded-full px-4 py-1.5 text-[11px] font-medium outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!simTextResponse.trim()}
                  className="bg-emerald-600 text-white p-2 rounded-full hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Meta Cloud Graph Core Payload API Log Panel */}
            <div className="w-full max-w-[360px] bg-slate-900 border border-slate-950 rounded-xl overflow-hidden font-mono text-[9px] shadow-sm">
              <div className="px-4 py-2 border-b border-slate-800 bg-slate-950 flex items-center justify-between text-slate-400 font-bold uppercase tracking-wider font-mono">
                <span>Outbound Meta API Payload Log</span>
                <span className="text-emerald-500 text-[8px] font-mono select-none">POST</span>
              </div>
              <div className="p-3 bg-slate-950 text-emerald-400 h-48 overflow-y-auto whitespace-pre font-mono leading-relaxed select-all">
                {simPayloadLogs}
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Segmented Navigation tabs */}
      <div className="bg-slate-100 p-1.5 rounded-xl flex gap-1.5 self-start border border-slate-200 overflow-x-auto no-scrollbar max-w-full">
        <button
          onClick={() => setActiveTab('FLEET')}
          className={`px-3.5 sm:px-4 py-2 min-h-[40px] text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap inline-flex items-center justify-center ${activeTab === 'FLEET' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Fleet Logbook
        </button>
        <button
          onClick={() => setActiveTab('COMPLIANCE')}
          className={`px-3.5 sm:px-4 py-2 min-h-[40px] text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap inline-flex items-center justify-center ${activeTab === 'COMPLIANCE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          ULIP Compliance Bench
        </button>
        <button
          onClick={() => setActiveTab('ASSIGNMENTS')}
          className={`px-3.5 sm:px-4 py-2 min-h-[40px] text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap inline-flex items-center justify-center ${activeTab === 'ASSIGNMENTS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Assignments ({assignments.length})
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

      {/* RETHINK FLEET LOGBOOK TABS */}
      {activeTab === 'FLEET' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          {/* List of currently owned vehicles and drivers */}
          <div className="space-y-6 lg:col-span-2">
            {loading ? (
              <>
                <ListCardSkeleton count={3} title="My Commercial Vehicles" />
                <ListCardSkeleton count={3} title="Contracted Drivers Roster" />
              </>
            ) : (
              <>
                {/* Active Truck Inventory */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-display">My Commercial Vehicles</h3>
                <span className="text-xs font-mono font-bold bg-slate-200 px-2 py-0.5 rounded text-slate-700">{vehicles.length} Active</span>
              </div>
              <div className="divide-y divide-slate-100">
                {vehicles.length === 0 ? (
                  <p className="p-6 text-slate-400 text-center text-xs">No registered vehicles found. Book your fleet asset below!</p>
                ) : (
                  vehicles.map((v) => (
                    <div key={v.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-900 text-white p-2 rounded-lg">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-slate-900 font-mono">{v.vehicleNumber}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{v.vehicleType} | Payload: {v.capacityKg} kg</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${v.vahanVerified ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                          {v.vahanVerified ? 'VAHAN Verified' : 'Vahan Pending'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${v.rcStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          RC: {v.rcStatus}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {hasMoreVeh && (
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-center">
                  <button
                    type="button"
                    onClick={handleLoadMoreVehicles}
                    disabled={loadingMoreVeh}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-lg border border-slate-200 transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-2xs"
                  >
                    {loadingMoreVeh ? 'Loading Fleet...' : 'Load More Fleet Assets (Firestore Pagination)'}
                  </button>
                </div>
              )}
            </div>

            {/* Active Driver roster */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-display">Contracted Drivers Roster</h3>
                <span className="text-xs font-mono font-bold bg-slate-200 px-2 py-0.5 rounded text-slate-700">{drivers.length} Drivers</span>
              </div>
              <div className="divide-y divide-slate-100">
                {drivers.length === 0 ? (
                  <p className="p-6 text-slate-400 text-center text-xs">No registered drivers.</p>
                ) : (
                  drivers.map((d) => {
                    const statusColorMap: Record<string, string> = {
                      OFF_DUTY: 'bg-slate-100 text-slate-600 border border-slate-200',
                      CHECKIN_SENT: 'bg-sky-50 text-sky-600 border border-sky-200 animate-pulse',
                      AVAILABLE: 'bg-emerald-50 text-emerald-750 border border-emerald-200',
                      DECLINED: 'bg-amber-55 text-amber-600 border border-amber-200',
                      ASSIGNED: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
                      AWAIT_PICKUP_LOCATION: 'bg-cyan-50 text-cyan-700 border border-cyan-200 animate-pulse',
                      LOADING: 'bg-amber-50 text-amber-700 border border-amber-200',
                      DISPATCH_SENT: 'bg-violet-50 text-violet-700 border border-violet-200',
                      IN_TRANSIT: 'bg-purple-100 text-purple-700 border border-purple-200',
                      AWAIT_DELIVERY_LOCATION: 'bg-cyan-50 text-cyan-700 border border-cyan-200 animate-pulse',
                      DELIVERED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                      PAYOUT_PENDING: 'bg-orange-50 text-orange-700 border border-orange-200 animate-pulse',
                      PAID: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
                      RETURN_CHECK: 'bg-sky-50 text-sky-700 border border-sky-200'
                    };
                    const fsmState = d.conversationState || 'OFF_DUTY';
                    const fsmClass = statusColorMap[fsmState] || statusColorMap.OFF_DUTY;

                    return (
                      <div key={d.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">{d.name}</span>
                            <span className="font-mono text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                              +91 {d.phone}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">DL: {d.dlNumber} | DOB: {d.dob}</span>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] font-medium text-slate-500 font-mono flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
                              WhatsApp Opt-In: Active (onboarding)
                            </span>
                            <span className="text-[10px] text-slate-300">|</span>
                            <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                              FSM Stage: <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${fsmClass}`}>{fsmState}</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-1 rounded text-[9px] font-bold ${d.sarathiVerified ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                            {d.sarathiVerified ? 'SARATHI Verified' : 'Sarathi Pending'}
                          </span>
                          <span className={`px-2 py-1 rounded text-[9px] font-bold ${d.hasTransportEndorsement ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {d.hasTransportEndorsement ? 'TRANS OK' : 'Non-Commercial Only'}
                          </span>
                          <button
                            onClick={() => handleOpenSimulator(d)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold px-3.5 py-2 min-h-[38px] rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all uppercase tracking-wider cursor-pointer active:scale-95"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Sim WhatsApp
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
              </>
            )}
          </div>

          {/* Quick asset additions column */}
          <div className="space-y-6">
            <form onSubmit={handleRegisterVehicle} className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-display">Add Fleet Vehicle</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Vehicle Registration Number *</label>
                  <input
                    type="text"
                    required
                    value={vehNumber}
                    onChange={(e) => setVehNumber(e.target.value)}
                    placeholder="e.g. UP91L0001"
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Chassis Number *</label>
                    <input
                      type="text"
                      required
                      value={chassisNumber}
                      onChange={(e) => setChassisNumber(e.target.value)}
                      placeholder="e.g. ME4JF509AH"
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Engine Number *</label>
                    <input
                      type="text"
                      required
                      value={engineNumber}
                      onChange={(e) => setEngineNumber(e.target.value)}
                      placeholder="e.g. JF50E76"
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Vehicle Type Classification</label>
                  <input
                    type="text"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    placeholder="e.g. 10-Wheeler Dry Truck"
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Payload Weight (KG) *</label>
                    <input
                      type="number"
                      required
                      value={capacityKg}
                      onChange={(e) => setCapacityKg(e.target.value)}
                      placeholder="e.g. 14000"
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Volume (Cubic Cm)</label>
                    <input
                      type="number"
                      value={volumeCubicCm}
                      onChange={(e) => setVolumeCubicCm(e.target.value)}
                      placeholder="e.g. 24000000"
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded"
                    />
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 min-h-[44px] rounded-lg text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer inline-flex items-center justify-center shadow-xs">
                Register Carrier asset
              </button>
            </form>

            <form onSubmit={handleRegisterDriver} className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-display">Add Driver Profile</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Driver's Name *</label>
                  <input
                    type="text"
                    required
                    value={drvName}
                    onChange={(e) => setDrvName(e.target.value)}
                    placeholder="e.g. Satnam ji Singh"
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={drvPhone}
                    onChange={(e) => setDrvPhone(e.target.value)}
                    placeholder="e.g. +91 9999888777"
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Driver License (DL) Number *</label>
                  <input
                    type="text"
                    required
                    value={dlNumber}
                    onChange={(e) => setDlNumber(e.target.value)}
                    placeholder="e.g. GJ0420120005008"
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Date of Birth (dob) *</label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 min-h-[44px] rounded-lg text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer inline-flex items-center justify-center shadow-xs">
                Enlist Goods Driver
              </button>
            </form>
          </div>
        </div>
      )}

      {/* COMPLIANCE TESTING MODULE */}
      {activeTab === 'COMPLIANCE' && (
        loading ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <TableSkeleton
              title="VAHAN & FASTAG Compliance Audits"
              headers={['Vehicle Number', 'Vahan verify', 'FASTAG Balance', 'eChallans pending', 'Actions']}
              rowCount={4}
            />
            <TableSkeleton
              title="SARATHI Driver credentials"
              headers={['Driver Name', 'License No', 'DL Status', 'TRANS Endorsement', 'Actions']}
              rowCount={4}
            />
          </div>
        ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-display">VAHAN & FASTAG Compliance Audits</h3>
            <div className="w-full overflow-x-auto -mx-3.5 sm:mx-0 px-3.5 sm:px-0">
              <table className="w-full text-xs text-left min-w-[700px]">
                <thead className="bg-[#f8fafc] text-[#64748b]">
                  <tr>
                    <th className="px-4 py-3 border-b">Vehicle Number</th>
                    <th className="px-4 py-3 border-b text-center">Vahan verify</th>
                    <th className="px-4 py-3 border-b text-center">FASTAG Balance</th>
                    <th className="px-4 py-3 border-b text-center">eChallans pending</th>
                    <th className="px-4 py-3 border-b text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3.5 font-mono font-bold">{v.vehicleNumber}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${v.vahanVerified ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                          {v.vahanVerified ? 'ACTIVE & BS-VI CERTIFIED' : 'PENDING'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${v.fastagStatus === 'LOW_BALANCE' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-800'}`}>
                          ₹{v.fastagBalance} ({v.fastagStatus})
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${v.pendingChallansCount > 0 ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-600'}`}>
                          {v.pendingChallansCount} Challans
                        </span>
                      </td>
                      <td className="px-4 py-3.5 align-middle text-right space-x-1 whitespace-nowrap">
                        <button
                          disabled={actionLoading[v.id]}
                          onClick={() => verifyVahanCompliance(v.id, v.vehicleNumber)}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3 py-1.5 min-h-[38px] rounded-lg text-xs uppercase truncate disabled:opacity-50 transition-all active:scale-95 cursor-pointer inline-flex items-center justify-center shadow-xs"
                        >
                          {actionLoading[v.id] ? 'VAHANing...' : 'Verify Vahan'}
                        </button>
                        <button
                          disabled={actionLoading[`fastag_${v.id}`]}
                          onClick={() => runFastagSync(v.id, v.vehicleNumber)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-3 py-1.5 min-h-[38px] rounded-lg text-xs uppercase truncate disabled:opacity-50 transition-all active:scale-95 cursor-pointer inline-flex items-center justify-center shadow-xs"
                        >
                          Check FASTAG
                        </button>
                        <button
                          disabled={actionLoading[`challan_${v.id}`]}
                          onClick={() => runEChallanAudit(v.id, v.vehicleNumber)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-3 py-1.5 min-h-[38px] rounded-lg text-xs uppercase truncate disabled:opacity-50 transition-all active:scale-95 cursor-pointer inline-flex items-center justify-center shadow-xs"
                        >
                          eChallan Checks
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-display">SARATHI Driver credentials</h3>
            <div className="w-full overflow-x-auto -mx-3.5 sm:mx-0 px-3.5 sm:px-0">
              <table className="w-full text-xs text-left min-w-[640px]">
                <thead className="bg-[#f8fafc] text-[#64748b]">
                  <tr>
                    <th className="px-4 py-3 border-b">Driver Name</th>
                    <th className="px-4 py-3 border-b">License No</th>
                    <th className="px-4 py-3 border-b text-center">DL Status</th>
                    <th className="px-4 py-3 border-b text-center">TRANS Endorsement</th>
                    <th className="px-4 py-3 border-b text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {drivers.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3.5 font-semibold text-slate-800">{d.name}</td>
                      <td className="px-4 py-3.5 font-mono">{d.dlNumber}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${d.dlStatus === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-150 text-slate-500'}`}>
                          {d.dlStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${d.hasTransportEndorsement ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
                          {d.hasTransportEndorsement ? 'ENDORSED OK' : 'MISSING ENDORSEMENT'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <button
                          disabled={actionLoading[d.id]}
                          onClick={() => verifySarathiCompliance(d.id, d.dlNumber)}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3.5 py-1.5 min-h-[38px] rounded-lg text-xs uppercase truncate disabled:opacity-50 transition-all active:scale-95 cursor-pointer inline-flex items-center justify-center shadow-xs"
                        >
                          {actionLoading[d.id] ? 'SARATHIing...' : 'Verify SARATHI'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )
      )}

      {/* DISPATCH/ASSIGNMENT TRIPS BOARD */}
      {activeTab === 'ASSIGNMENTS' && (
        loading ? (
          <GridCardSkeleton count={4} title="Carrier Trip Assigned Workspace" />
        ) : (
        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-300">
          <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-display">Carrier Trip Assigned Workspace</h3>
            <span className="text-[10px] text-slate-400 font-mono">TRACKING SYNC OK</span>
          </div>

          {assignments.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No active deliveries are assigned to your carrier fleet yet. Manage bookings on admin workstation panel.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignments.map((del) => (
                <div key={del.id} className="border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm hover:border-slate-300 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block font-semibold">SHIPMENT ID: {del.id}</span>
                      <h4 className="text-xs font-extrabold text-slate-800 mt-0.5">{del.goodsDescription}</h4>
                    </div>
                    <span className="font-mono text-[9px] font-extrabold bg-slate-900 text-white px-2 py-0.5 rounded border">
                      {del.status}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-2.5 text-[10px] space-y-1 text-slate-600 font-medium">
                    <div className="flex justify-between">
                      <span>Consignment Weight:</span>
                      <span className="font-bold text-slate-800">{del.goodsWeightKg} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Route Waypoints:</span>
                      <span className="font-bold text-slate-800">{del.pickupLocation} ➔ {del.destinationLocation}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[9px] text-slate-400 font-mono">GPS tracking sync active</span>
                    {['CONFIRMED', 'DISPATCHED', 'IN_TRANSIT'].includes(del.status) && (
                      <button
                        onClick={() => handleTripProgress(del.id, del.status)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 min-h-[40px] rounded-lg text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-xs inline-flex items-center justify-center"
                      >
                        {del.status === 'CONFIRMED' ? 'Start Dispatch' : del.status === 'DISPATCHED' ? 'Mark In Transit' : 'Mark Delivered'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )
      )}
    </div>
  );
};
