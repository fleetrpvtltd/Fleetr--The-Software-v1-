import { describe, it, expect } from 'vitest';

describe('Order State Machine', () => {
  const transitions: Record<string, string[]> = {
    REQUESTED: ['TRUCK_CONFIRMED', 'CANCELLED'],
    TRUCK_CONFIRMED: ['GODOWN_CONFIRMED', 'CANCELLED'],
    GODOWN_CONFIRMED: ['PAYMENT_PENDING', 'CANCELLED'],
    PAYMENT_PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['DISPATCHED', 'CANCELLED'],
    DISPATCHED: ['DELIVERED', 'CANCELLED'],
    DELIVERED: [],
    CANCELLED: []
  };
  const isValidTransition = (from: string, to: string) => transitions[from]?.includes(to) ?? false;

  it('REQUESTED → TRUCK_CONFIRMED: should pass', () => expect(isValidTransition('REQUESTED', 'TRUCK_CONFIRMED')).toBe(true));
  it('REQUESTED → CANCELLED: should pass', () => expect(isValidTransition('REQUESTED', 'CANCELLED')).toBe(true));
  it('TRUCK_CONFIRMED → GODOWN_CONFIRMED: should pass', () => expect(isValidTransition('TRUCK_CONFIRMED', 'GODOWN_CONFIRMED')).toBe(true));
  it('GODOWN_CONFIRMED → PAYMENT_PENDING: should pass', () => expect(isValidTransition('GODOWN_CONFIRMED', 'PAYMENT_PENDING')).toBe(true));
  it('PAYMENT_PENDING → CONFIRMED: should pass', () => expect(isValidTransition('PAYMENT_PENDING', 'CONFIRMED')).toBe(true));
  it('CONFIRMED → DISPATCHED: should pass', () => expect(isValidTransition('CONFIRMED', 'DISPATCHED')).toBe(true));
  it('DISPATCHED → DELIVERED: should pass', () => expect(isValidTransition('DISPATCHED', 'DELIVERED')).toBe(true));
  it('Invalid: REQUESTED → DISPATCHED: should throw', () => expect(isValidTransition('REQUESTED', 'DISPATCHED')).toBe(false));
  it('Invalid: DELIVERED → REQUESTED: should throw', () => expect(isValidTransition('DELIVERED', 'REQUESTED')).toBe(false));
  it('Invalid: CONFIRMED → PAYMENT_PENDING: should throw (no backward transitions)', () => expect(isValidTransition('CONFIRMED', 'PAYMENT_PENDING')).toBe(false));
});
