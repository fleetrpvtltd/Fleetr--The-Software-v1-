import axios from 'axios';
import { env } from '../../../config/env.js';
import { CircuitBreaker } from '../../../utils/circuit-breaker.js';
import { cacheGet, cacheSet } from '../../../config/redis.js';

const cb = new CircuitBreaker();

export const getMapplsToken = async (): Promise<string> => {
  const cachedToken = await cacheGet('mappls:token');
  if (cachedToken) return cachedToken;

  const url = 'https://outpost.mapmyindia.com/api/security/oauth/token';
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', env.MAPMYINDIA_CLIENT_ID || '');
  params.append('client_secret', env.MAPMYINDIA_CLIENT_SECRET || '');

  const response = await axios.post(url, params);
  const token = response.data.access_token;
  
  await cacheSet('mappls:token', token, response.data.expires_in - 300); // Expiry buffer
  return token;
};

export const getHeavyVehicleRoute = async (start: string, end: string, profile: 'truck' = 'truck') => {
  return cb.execute(async () => {
    const token = await getMapplsToken();
    const url = `https://apis.mappls.com/advancedmaps/v1/${token}/route_adv/${profile}/${start};${end}`;
    
    // Truck dimensions/weight/axle could be added as query params depending on exact Mappls API specs
    const response = await axios.get(url, {
      params: {
        steps: true,
        alternatives: true
      }
    });
    
    return response.data;
  });
};
