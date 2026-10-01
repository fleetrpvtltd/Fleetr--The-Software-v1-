import { ZipcodeGeo } from '../../../models/ZipcodeGeo.js';
import { AppError } from '../../../middleware/error-handler.js';

export const PINCODE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  '400001': { lat: 18.9388, lng: 72.8354 }, // Mumbai
  '110001': { lat: 28.6315, lng: 77.2167 }, // Delhi
  '700001': { lat: 22.5726, lng: 88.3639 }, // Kolkata
  '560001': { lat: 12.9716, lng: 77.5946 }, // Bangalore
};

export const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
            
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const getFallbackDistance = async (pincode1: string, pincode2: string): Promise<{ distanceKm: number, durationMinutes: number }> => {
  let geo1 = PINCODE_COORDINATES[pincode1];
  let geo2 = PINCODE_COORDINATES[pincode2];

  if (!geo1 || !geo2) {
    try {
      const [dbGeo1, dbGeo2] = await Promise.all([
        ZipcodeGeo.findOne({ pincode: pincode1 }).maxTimeMS(2000),
        ZipcodeGeo.findOne({ pincode: pincode2 }).maxTimeMS(2000)
      ]);
      if (dbGeo1) geo1 = { lat: dbGeo1.lat, lng: dbGeo1.lng };
      if (dbGeo2) geo2 = { lat: dbGeo2.lat, lng: dbGeo2.lng };
    } catch (e) {
      // In tests or offline DB
    }
  }

  if (!geo1 || !geo2) {
    throw new AppError('Geodata not found for one or more pincodes', 404);
  }

  const straightLineDist = haversineDistance(geo1.lat, geo1.lng, geo2.lat, geo2.lng);
  const roadDistance = straightLineDist * 1.3; // 1.3 road factor
  
  // Assume average truck speed 40km/h
  const durationMinutes = (roadDistance / 40) * 60;
  
  return { distanceKm: Math.round(roadDistance * 100) / 100, durationMinutes: Math.round(durationMinutes) };
};
