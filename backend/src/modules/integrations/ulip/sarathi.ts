import axios from 'axios';
import { env } from '../../../config/env.js';
import { getUlipToken } from './token-manager.js';
import { CircuitBreaker } from '../../../utils/circuit-breaker.js';
import { UlipRequestLog } from '../../../models/UlipRequestLog.js';
import { AppError } from '../../../middleware/error-handler.js';

const cb = new CircuitBreaker();

export const verifyDrivingLicense = async (dlnumber: string, dob: string) => {
  return cb.execute(async () => {
    const token = await getUlipToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    };
    const body = { dlnumber, dob };

    const endpoint = '/ulip/v1.0.0/SARATHI/01';
    let data;
    let status;
    const startTime = Date.now();

    try {
      const response = await axios.post(`${env.ULIP_BASE_URL}${endpoint}`, body, { headers });
      data = response.data;
      status = response.status;
      
      if (data?.response?.[0]?.responseCode === '231') {
        throw new Error('DL not found (231)');
      }
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
    
    const responseData = data?.response?.[0]?.response;
    if (responseData && responseData.dlStatus !== 'Active') {
       // DL is not active, but the lookup was successful. Handled by business logic.
    }

    return responseData;
  });
};
