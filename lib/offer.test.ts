import { describe, expect, it } from 'vitest';
import {
  foundingDescription,
  foundingHeadline,
  getFoundingOffer,
  monthsLabel,
} from '@/lib/offer';

describe('getFoundingOffer', () => {
  it('uses the published defaults when nothing is configured', () => {
    const offer = getFoundingOffer({});
    expect(offer).toEqual({
      enabled: true,
      capacity: 100,
      feeFreeMonths: 3,
      badge: 'Founding Vendor',
    });
  });

  it('reads overrides from the environment', () => {
    const offer = getFoundingOffer({
      FOUNDING_VENDORS_ENABLED: 'false',
      FOUNDING_VENDORS_CAPACITY: '50',
      FOUNDING_FEE_FREE_MONTHS: '6',
      FOUNDING_BADGE_NAME: 'Pioneer',
    });

    expect(offer).toEqual({
      enabled: false,
      capacity: 50,
      feeFreeMonths: 6,
      badge: 'Pioneer',
    });
  });

  it('falls back instead of trusting nonsense values', () => {
    const offer = getFoundingOffer({
      FOUNDING_VENDORS_CAPACITY: 'lots',
      FOUNDING_FEE_FREE_MONTHS: '-4',
    });

    expect(offer.capacity).toBe(100);
    expect(offer.feeFreeMonths).toBe(1);
  });

  it('caps runaway values', () => {
    const offer = getFoundingOffer({
      FOUNDING_VENDORS_CAPACITY: '999999',
      FOUNDING_FEE_FREE_MONTHS: '99',
    });

    expect(offer.capacity).toBe(100_000);
    expect(offer.feeFreeMonths).toBe(24);
  });
});

describe('offer copy', () => {
  const offer = getFoundingOffer({ FOUNDING_VENDORS_CAPACITY: '50' });

  it('renders the real numbers', () => {
    expect(foundingHeadline(offer)).toBe('First 50 vendors get zero fees for 3 months');
    expect(foundingDescription(offer)).toContain('a Founding Vendor badge');
  });

  it('handles a single month', () => {
    expect(monthsLabel(1)).toBe('1 month');
    expect(monthsLabel(3)).toBe('3 months');
  });
});
