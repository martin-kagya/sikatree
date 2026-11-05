import { describe, expect, it } from 'vitest';
import { deliveryFeeFor, etaFor, newOrderCode } from '@/lib/orders';

describe('order codes', () => {
  it('uses the ORD prefix and Crockford characters', () => {
    for (let index = 0; index < 40; index += 1) {
      expect(newOrderCode()).toMatch(/^ORD-[0-9A-HJKMNP-TV-Z]{4}$/);
    }
  });
});

describe('delivery fees', () => {
  it('charges only for delivery', () => {
    expect(deliveryFeeFor('delivery')).toBe(1500);
    expect(deliveryFeeFor('pickup')).toBe(0);
    expect(deliveryFeeFor('appointment')).toBe(0);
  });
});

describe('eta labels', () => {
  it('describes delivery, pickup and appointments', () => {
    expect(etaFor('delivery', null)).toContain('45 to 60');
    expect(etaFor('pickup', null)).toContain('30 minutes');
    const when = new Date('2026-11-06T10:00:00Z');
    expect(etaFor('appointment', when)).toContain('Appointment on');
  });
});
