import { getHeavyVehicleRoute } from './routing.js';
import { getFallbackDistance } from './fallback.js';

export const getSmartRoute = async (startGeocode: string, endGeocode: string, startPincode: string, endPincode: string) => {
  try {
    // Try Mappls API first
    const routeData = await getHeavyVehicleRoute(startGeocode, endGeocode);
    return {
      source: 'mappls',
      data: routeData
    };
  } catch (error) {
    console.warn('Mappls routing failed, falling back to Euclidean estimation:', error);
    // Fallback to Euclidean/Haversine distance
    const fallbackData = await getFallbackDistance(startPincode, endPincode);
    return {
      source: 'fallback',
      data: fallbackData
    };
  }
};

export * from './routing.js';
export * from './distance.js';
export * from './fallback.js';
