import axios from 'axios';
import { CircuitBreaker } from '../../../utils/circuit-breaker.js';
import { getMapplsToken } from './routing.js';

const cb = new CircuitBreaker();

export const getDistanceMatrix = async (sources: string, destinations: string, profile: string = 'driving') => {
  return cb.execute(async () => {
    const token = await getMapplsToken();
    const url = `https://apis.mappls.com/advancedmaps/v1/${token}/distance_matrix/${profile}/${sources};${destinations}`;
    
    const response = await axios.get(url);
    return response.data;
  });
};
