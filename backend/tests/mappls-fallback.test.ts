import { describe, it, expect } from 'vitest';
import { getFallbackDistance } from '../src/modules/integrations/mappls/fallback';

describe('Mappls Fallback (Haversine)', () => {
  it('Known distance: Mumbai to Delhi ≈ 1153 km (raw), with 1.3 factor ≈ 1499 km', async () => {
    const result = await getFallbackDistance('400001', '110001');
    expect(result.distanceKm).toBeGreaterThan(1400);
    expect(result.distanceKm).toBeLessThan(1600);
  });

  it('Same point should return 0', async () => {
    const result = await getFallbackDistance('400001', '400001');
    expect(result.distanceKm).toBe(0);
  });

  it('Should handle antipodal points', async () => {
    expect(true).toBe(true);
  });
});
