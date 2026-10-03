/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FastagWaypoint } from '../types';

export interface UlipSession {
  token: string;
  expiresAt: number;
}

// Token manager storing token in memory (or standard local cache)
class UlipTokenManager {
  private session: UlipSession | null = null;
  private username = process.env.ULIP_USERNAME || 'xxxx';
  private password = process.env.ULIP_PASSWORD || 'xxxx@123';

  public async getToken(): Promise<string> {
    const now = Date.now();
    if (this.session && this.session.expiresAt > now + 300000) { // 5 mins buffer
      return this.session.token;
    }
    // Simulate auth token API refresh (valid for 30 minutes)
    const mockToken = 'eyJhbGciOiJIUzUxMiJ9.' + Math.random().toString(36).substring(2) + '.' + Math.random().toString(36).substring(2);
    this.session = {
      token: mockToken,
      expiresAt: now + 30 * 60 * 1000 // 30 minutes
    };
    return mockToken;
  }
}

export const ulipTokenManager = new UlipTokenManager();

// VAHAN verification compliance checking
export function verifyVahan(vehicleNo: string) {
  // Regex pattern validate
  const vehicleRegex = /^[A-Z0-9]{5,11}$/;
  if (!vehicleRegex.test(vehicleNo)) {
    return {
      success: false,
      code: '400',
      message: 'Data format failed OR wrong value entered. Format should follow ^[A-Z0-9]{5,11}$'
    };
  }

  // Active check
  if (vehicleNo === 'UP32KH0320') {
    return {
      success: false,
      code: '231',
      message: 'Vehicle Details not Found on National Register Index'
    };
  }

  return {
    success: true,
    data: {
      rc_regn_no: vehicleNo,
      rc_status: 'ACTIVE',
      rc_owner_name: 'S***R S***H / S***R F***T',
      rc_fit_upto: vehicleNo === 'HR55AB1234' ? '2028-06-12' : '2032-01-25',
      rc_insurance_upto: vehicleNo === 'HR55AB1234' ? '2026-11-20' : '2027-09-15',
      rc_unld_wt: '11080',
      rc_gvw: '28600',
      rc_norms_desc: 'BHARAT STAGE VI',
      rc_status_as_on: new Date().toISOString().split('T')[0]
    }
  };
}

// SARATHI validation checks
export function verifySarathi(dlNumber: string, dob: string) {
  // DL Pattern check
  const dlRegex = /^(([A-Z]{2}(-)[0-9]{2})|([A-Z]{2}[0-9]{2}))((19|20)[0-9][0-9])[0-9]{7}$/;
  if (!dlRegex.test(dlNumber.replace(/\s/g, ''))) {
    return {
      success: false,
      code: '400',
      message: 'Data format failed OR wrong value entered'
    };
  }

  // DOB pattern Check
  const dobRegex = /^\d{4}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/;
  if (!dobRegex.test(dob)) {
    return {
      success: false,
      code: '400',
      message: 'Data format failed OR wrong value entered at dob'
    };
  }

  // Simulate not found
  if (dlNumber.includes('9999')) {
    return {
      success: false,
      code: '-1',
      message: 'No Details are available'
    };
  }

  // Check transport endorsement
  const hasTrans = !dlNumber.includes('0009876'); // Ravi Kumar fails transport endorsement check

  return {
    success: true,
    data: {
      dlLicno: dlNumber,
      dob: dob,
      dlStatus: 'Active',
      hasTransportEndorsement: hasTrans,
      ownerName: 'M***H S***K*M*R',
      dlcovs: [
        { covabbrv: 'LMV', vecatg: 'NT' },
        ...(hasTrans ? [{ covabbrv: 'TRANS', vecatg: 'TR' }] : [])
      ]
    }
  };
}

// FASTAG verification history (Fastag/01 toll plaza history + Fastag/02 vehicle detail)
export function checkFastag(vehicleNumber?: string, tagId?: string) {
  // Block both inputs passed
  if (vehicleNumber && tagId) {
    return {
      success: false,
      code: '239',
      message: 'In case if we enter both vehiclenumber and tagid, system returns FAILURE error'
    };
  }

  if (!vehicleNumber && !tagId) {
    return {
      success: false,
      code: '400',
      message: 'vehiclenumber or tagid: must not be Empty or null!'
    };
  }

  if (vehicleNumber) {
    const vRegex = /^[A-Z0-9]{5,11}$|^[A-Z0-9]{17,20}$/;
    if (!vRegex.test(vehicleNumber)) {
      return {
        success: false,
        code: '400',
        message: 'Invalid vehicle number format.'
      };
    }
  }

  // Fastag simulation
  return {
    success: true,
    data: {
      TAGID: tagId || '34161FA8203286140F4064E0',
      REGNUMBER: vehicleNumber || 'UP91L0001',
      TAGSTATUS: vehicleNumber === 'UP32KH0320' ? 'I' : 'A', // inactive or low balance
      COMVEHICLE: 'T',
      EXCCODE: '00',
      balance: vehicleNumber === 'UP32KH0320' ? 40 : 4500,
      recentWaypoints: [
        {
          readerReadTime: '2026-05-30T12:26:09Z',
          seqNo: '68d47e2d-c10f-4-2dfb547ce5c8',
          laneDirection: 'N',
          tollPlazaGeocode: '22.9812,72.5015',
          tollPlazaName: 'GMR Chillakallu Toll Plaza'
        }
      ] as FastagWaypoint[]
    }
  };
}

// ECHALLAN parsing
export function verifyEChallan(vehicleNo: string) {
  const vehicleRegex = /^[a-zA-Z0-9]{5,11}$/;
  if (!vehicleRegex.test(vehicleNo)) {
    return {
      success: false,
      code: '400',
      message: 'Invalid vehicle number format'
    };
  }

  if (vehicleNo === 'UP32KH0320') {
    return {
      success: true,
      pendingChallans: [
        {
          challan_no: 'KL548476230713105383',
          fine_imposed: '7750',
          received_amount: '0',
          challan_date_time: '2026-05-25T17:36:00Z',
          challan_place: 'Okhla Flyover Delhi',
          offence_details: 'Fitness Certificate not produced on demand; speed violation.',
          sent_to_virtual_court: 'No',
          sent_to_reg_court: 'Yes' // Legal Bottleneck Alert
        }
      ]
    };
  }

  return {
    success: true,
    pendingChallans: []
  };
}

// AAICLAS export import tracker
export function verifyAaiclas(awbNumber: string, location: string) {
  const awbRegex = /^[0-9]{11}$/;
  if (!awbRegex.test(awbNumber)) {
    return {
      success: false,
      code: '400',
      message: 'Invalid Air Waybill format. Must be 11 digits.'
    };
  }

  return {
    success: true,
    data: {
      awbNo: awbNumber,
      location: location,
      xRayStatus: 'PASSED',
      uldNo: 'BT-SQ517',
      flightNo: 'AI-101',
      status: 'GATEPASS_ISSUED',
      commodity: 'Garments Goods',
      packages: 12,
      grossWeightKg: 4200
    }
  };
}
