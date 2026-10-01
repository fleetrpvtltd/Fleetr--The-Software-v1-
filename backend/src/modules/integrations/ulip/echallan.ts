import axios from 'axios';
import { env } from '../../../config/env.js';
import { getUlipToken } from './token-manager.js';
import { CircuitBreaker } from '../../../utils/circuit-breaker.js';
import { UlipRequestLog } from '../../../models/UlipRequestLog.js';

const cb = new CircuitBreaker();

export const checkEChallan = async (vehiclenumber: string) => {
  return cb.execute(async () => {
    const token = await getUlipToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    };
    const body = { vehiclenumber };

    const endpoint = '/ulip/v1.0.0/ECHALLAN/01';
    let data;
    let status;
    const startTime = Date.now();

    try {
      const response = await axios.post(`${env.ULIP_BASE_URL}${endpoint}`, body, { headers });
      data = response.data;
      status = response.status;
    } catch (error: any) {
      status = error.response?.status || 500;
      data = error.response?.data || { message: error.message };

      await UlipRequestLog.create({
        apiEndpoint: endpoint,
        requestPayload: body,
        responseStatus: status,
        responseData: data,
        latencyMs: Date.now() - startTime,
        success: false,
        errorMessage: error.message
      });
      throw error;
    }

    await UlipRequestLog.create({
      apiEndpoint: endpoint,
      requestPayload: body,
      responseStatus: status,
      responseData: data,
      latencyMs: Date.now() - startTime,
      success: true
    });

    const challans = data?.response?.[0]?.response?.challanDetails || [];
    let hasBlockingViolations = false;
    const blockingCodes = ['S130(4)', 'S66(1)', 'overloading']; // Example markers

    for (const challan of challans) {
      // Logic to flag blocking violations based on response
      const violationType = challan.violationType || '';
      if (blockingCodes.some(code => violationType.includes(code))) {
         hasBlockingViolations = true;
         break;
      }
    }

    return { challans, hasBlockingViolations };
  });
};
