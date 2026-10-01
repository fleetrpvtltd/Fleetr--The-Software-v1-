import axios from 'axios';
import { env } from '../../../config/env.js';
import { getUlipToken } from './token-manager.js';
import { CircuitBreaker } from '../../../utils/circuit-breaker.js';
import { UlipRequestLog } from '../../../models/UlipRequestLog.js';
import { AppError } from '../../../middleware/error-handler.js';

const cb = new CircuitBreaker();

export const verifyFastagStatus = async (vehiclenumber: string) => {
  return cb.execute(async () => {
    const token = await getUlipToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    };
    const body = { vehiclenumber };

    const endpoint = '/ulip/v1.0.0/FASTAG/02';
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

    return data?.response?.[0]?.response;
  });
};

export const getFastagHistory = async (vehiclenumber: string) => {
  return cb.execute(async () => {
    const token = await getUlipToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    };
    const body = { vehiclenumber };

    const endpoint = '/ulip/v1.0.0/FASTAG/01';
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

    return data?.response?.[0]?.response?.vehicleTollHistory || [];
  });
};
