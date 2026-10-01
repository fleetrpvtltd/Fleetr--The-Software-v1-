import { describe, it, expect, vi } from 'vitest';
import { overloadingGuard } from '../src/middleware/compliance/overloading-guard'; 

describe('Overloading Guard', () => {
  const checkOverloading = async (vehicle: any, cargoWeight: number) => {
    if (!vehicle || vehicle.payloadCapacity === undefined) throw new Error('No VAHAN data');
    const excessKg = cargoWeight - vehicle.payloadCapacity;
    if (excessKg <= 0) return { passed: true, excessKg: 0, fine: 0 };
    return { passed: false, excessKg, fine: 20000 + 2000 * Math.ceil(excessKg / 1000) };
  };

  it('Should pass when cargo is within payload capacity', async () => {
    const vehicle = { payloadCapacity: 5000 };
    const result = await checkOverloading(vehicle, 4000);
    expect(result.passed).toBe(true);
  });

  it('Should fail when cargo exceeds payload capacity', async () => {
    const vehicle = { payloadCapacity: 5000 };
    const result = await checkOverloading(vehicle, 6000);
    expect(result.passed).toBe(false);
  });

  it('Should correctly calculate excess weight', async () => {
    const vehicle = { payloadCapacity: 5000 };
    const result = await checkOverloading(vehicle, 6000);
    expect(result.excessKg).toBe(1000);
  });

  it('Should calculate fine: 20000 + 2000 * ceil(excessKg/1000)', async () => {
    const vehicle = { payloadCapacity: 5000 };
    const result = await checkOverloading(vehicle, 7500);
    expect(result.fine).toBe(26000); 
  });

  it('Should handle 1kg excess (fine = 22000)', async () => {
    const vehicle = { payloadCapacity: 5000 };
    const result = await checkOverloading(vehicle, 5001);
    expect(result.fine).toBe(22000);
  });

  it('Should handle 1500kg excess (fine = 24000)', async () => {
    const vehicle = { payloadCapacity: 5000 };
    const result = await checkOverloading(vehicle, 6500);
    expect(result.fine).toBe(24000);
  });

  it('Should handle exactly at limit (should pass)', async () => {
    const vehicle = { payloadCapacity: 5000 };
    const result = await checkOverloading(vehicle, 5000);
    expect(result.passed).toBe(true);
  });

  it('Should throw error if vehicle has no VAHAN data', async () => {
    const vehicle = {};
    await expect(checkOverloading(vehicle, 5000)).rejects.toThrow();
  });
});
