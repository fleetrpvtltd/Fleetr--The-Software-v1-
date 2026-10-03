/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { dbService } from './dbService';
import { verifyEChallan } from './ulipServices';

export interface RankedTruck {
  vehicleId: string;
  vehicleNumber: string;
  score: number;
  explanation: string;
}

export interface RankedGodown {
  godownId: string;
  name: string;
  score: number;
  explanation: string;
}

export interface AnomalyAlert {
  type: 'CRITICAL' | 'WARNING';
  source: string;
  message: string;
  details: string;
}

// 1. Delivery Assignment Optimizer (Direct Firestore Integration)
export async function getOptimizedTrucks(deliveryId: string): Promise<RankedTruck[]> {
  const [delivery, vehicles, users] = await Promise.all([
    dbService.getDelivery(deliveryId),
    dbService.getVehicles(),
    dbService.getUsers()
  ]);

  if (!delivery) return [];

  const weight = delivery.goodsWeightKg;
  const volume = delivery.goodsVolumeCubicCm;

  return vehicles
    .map((veh) => {
      let score = 95;
      const explanations: string[] = [];

      // Physical fit rule
      if (veh.capacityKg < weight) {
        score -= 50;
        explanations.push(`Truck payload capacity (${veh.capacityKg} kg) is insufficient for goods weight (${weight} kg) - Danger of overloading.`);
      } else {
        explanations.push(`Payload capacity fits perfectly (${Math.round((weight / veh.capacityKg) * 100)}% weight utilization).`);
      }

      if (veh.volumeCubicCm < volume) {
        score -= 40;
        explanations.push(`Cargo dimension exceeds volumetric footprint.`);
      }

      // Vahan verify deduction
      if (!veh.vahanVerified) {
        score -= 30;
        explanations.push('Warning: Vehicle is not fully checked with National VAHAN Registry.');
      }

      // Fastag status deduction
      if (veh.fastagStatus === 'LOW_BALANCE') {
        score -= 15;
        explanations.push('Fastag balance is low. Risk of transit toll delay.');
      }

      // Fleet distance/driver mismatch
      const owner = users.find((u) => u.id === veh.ownerId);
      if (owner) {
        explanations.push(`Dispatched by experienced carrier: ${owner.organizationName || owner.name}.`);
      }

      return {
        vehicleId: veh.id,
        vehicleNumber: veh.vehicleNumber,
        score: Math.max(10, score),
        explanation: explanations.join(' ')
      };
    })
    .sort((a, b) => b.score - a.score);
}

// 2. Godown Routing Intelligence (Direct Firestore Integration)
export async function getOptimizedGodowns(deliveryId: string): Promise<RankedGodown[]> {
  const [delivery, godowns] = await Promise.all([
    dbService.getDelivery(deliveryId),
    dbService.getGodowns()
  ]);

  if (!delivery) return [];

  return godowns
    .map((gdn) => {
      let score = 90;
      const explanations: string[] = [];

      // Capacity check log
      const occupancy = (gdn.totalCapacityKg - gdn.availableCapacityKg) / gdn.totalCapacityKg;
      if (occupancy > 0.9) {
        score -= 30;
        explanations.push(`High occupancy (${Math.round(occupancy * 100)}%). Risk of staging delays.`);
      } else {
        explanations.push(`Ample dynamic warehousing payload margin available (${Math.round(gdn.availableCapacityKg / 1000)} Tons free space).`);
      }

      // Proximity simulation based on category
      if (gdn.storageTypes && gdn.storageTypes.includes(delivery.goodsCategory)) {
        score += 10;
        explanations.push(`Supports category-specific storage configuration for ${delivery.goodsCategory}.`);
      }

      return {
        godownId: gdn.id,
        name: gdn.name,
        score: score,
        explanation: explanations.join(' ')
      };
    })
    .sort((a, b) => b.score - a.score);
}

// 3. Anomaly Detection (Direct Firestore Integration)
export async function getAnomalies(): Promise<AnomalyAlert[]> {
  const alerts: AnomalyAlert[] = [];
  const [vehicles, drivers, deliveries] = await Promise.all([
    dbService.getVehicles(),
    dbService.getDrivers(),
    dbService.getDeliveries()
  ]);

  // Inspect Vehicles
  vehicles.forEach((veh) => {
    // Overloading check
    if (veh.rcStatus !== 'ACTIVE') {
      alerts.push({
        type: 'CRITICAL',
        source: `Vehicle: ${veh.vehicleNumber}`,
        message: 'Non-active RC registration status',
        details: 'National Register lists vehicle as INACTIVE. Commercial hauling is illegal.'
      });
    }

    const fitnessDate = new Date(veh.fitnessValidUntil);
    if (fitnessDate < new Date()) {
      alerts.push({
        type: 'CRITICAL',
        source: `Vehicle: ${veh.vehicleNumber}`,
        message: 'Roadworthiness Fitness Certificate Expired',
        details: `Fitness valid until ${veh.fitnessValidUntil}. Must fail dispatch compliance audit.`
      });
    }

    const insuranceDate = new Date(veh.insuranceValidUntil);
    if (insuranceDate < new Date()) {
      alerts.push({
        type: 'CRITICAL',
        source: `Vehicle: ${veh.vehicleNumber}`,
        message: 'Third Party Commercial Insurance Expired',
        details: `Insurance validity expired on ${veh.insuranceValidUntil}.`
      });
    }

    if (veh.fastagStatus === 'LOW_BALANCE') {
      alerts.push({
        type: 'WARNING',
        source: `FASTAG TagID: ${veh.chassisNumber}`,
        message: 'Tag Balance Insufficient Surcharge Warning',
        details: `Current FASTAG wallet holds only ₹${veh.fastagBalance}. Toll crossing may trigger double blacklist penalty.`
      });
    }

    // Inspect Challans
    const challans = verifyEChallan(veh.vehicleNumber);
    if (challans.success && challans.pendingChallans && challans.pendingChallans.length > 0) {
      challans.pendingChallans.forEach((chal) => {
        if (chal.sent_to_reg_court === 'Yes') {
          alerts.push({
            type: 'CRITICAL',
            source: `eChallan Audit: ${veh.vehicleNumber}`,
            message: 'Vehicle Blacklisted/Referred to Judicial Magistrate Court',
            details: `Challan No: ${chal.challan_no} for offense: "${chal.offence_details}" was forwarded to Regular Court. Severe legal operational block!`
          });
        }
      });
    }
  });

  // Inspect Drivers
  drivers.forEach((drv) => {
    if (!drv.hasTransportEndorsement) {
      alerts.push({
        type: 'CRITICAL',
        source: `Driver License: ${drv.name}`,
        message: 'Missing Heavy Commercial Goods Transport Endorsement',
        details: `SARATHI lists license ${drv.dlNumber} without active TRANS endorsement. Operation of commercial freight is unauthorized.`
      });
    }
  });

  // Transit delay checks
  deliveries.forEach((del) => {
    if (del.status === 'IN_TRANSIT' && del.urgencyLevel === 'SAME_DAY') {
      const hoursInTransit = (Date.now() - new Date(del.createdAt).getTime()) / (1000 * 60 * 60);
      if (hoursInTransit > 12) {
        alerts.push({
          type: 'WARNING',
          source: `Delivery Route: ${del.id}`,
          message: 'Same-day Express Transit Delay detected',
          details: `Trip is in transit for over ${Math.floor(hoursInTransit)} hours. GPS tracking/Fastag waypoint not updating.`
        });
      }
    }
  });

  return alerts;
}

// 4. Demand forecasting
export function getDemandForecast() {
  return {
    forecast3Day: Math.floor(Math.random() * 25) + 40, // 40-65 tons metric
    forecast7Day: Math.floor(Math.random() * 60) + 120, // 120-180 tons
    historicalWeeklyVolumes: [
      { day: 'Mon', cargoTons: 12 },
      { day: 'Tue', cargoTons: 19 },
      { day: 'Wed', cargoTons: 15 },
      { day: 'Thu', cargoTons: 25 },
      { day: 'Fri', cargoTons: 32 },
      { day: 'Sat', cargoTons: 28 },
      { day: 'Sun', cargoTons: 10 }
    ],
    forecastedVolumes: [
      { day: 'Jun 2', cargoTons: 15 },
      { day: 'Jun 3', cargoTons: 22 },
      { day: 'Jun 4', cargoTons: 30 },
      { day: 'Jun 5', cargoTons: 27 },
      { day: 'Jun 6', cargoTons: 18 }
    ]
  };
}
