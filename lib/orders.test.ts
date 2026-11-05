import { describe, expect, it } from 'vitest';
import { etaFor, newOrderCode } from '@/lib/orders';

describe('order codes', () => {
  it('uses the ORD prefix and Crockford characters', () => {
    for (let index = 0; index < 40; index += 1) {
      expect(newOrderCode()).toMatch(/^ORD-[0-9A-HJKMNP-TV-Z]{4}$/);
    }
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
