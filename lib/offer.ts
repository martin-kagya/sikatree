// The founding vendor offer is configuration, not copy scattered through the
// page (LP-16). Values are read at build time because the landing page is
// static, so changing them needs a rebuild.

export type FoundingOffer = {
  enabled: boolean;
  capacity: number;
  feeFreeMonths: number;
  badge: string;
};

const DEFAULTS: FoundingOffer = {
  enabled: true,
  capacity: 100,
  feeFreeMonths: 3,
  badge: 'Founding Vendor',
};

function readInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  const value = Number(raw);
  if (!Number.isInteger(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function readBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw.trim() === '') return fallback;
  return !['false', '0', 'off', 'no'].includes(raw.trim().toLowerCase());
}

export function getFoundingOffer(env: Record<string, string | undefined> = process.env): FoundingOffer {
  return {
    enabled: readBool(env.FOUNDING_VENDORS_ENABLED, DEFAULTS.enabled),
    capacity: readInt(env.FOUNDING_VENDORS_CAPACITY, DEFAULTS.capacity, 1, 100_000),
    feeFreeMonths: readInt(env.FOUNDING_FEE_FREE_MONTHS, DEFAULTS.feeFreeMonths, 1, 24),
    badge: env.FOUNDING_BADGE_NAME?.trim() || DEFAULTS.badge,
  };
}

export const foundingOffer: FoundingOffer = getFoundingOffer();

export function monthsLabel(months: number): string {
  return months === 1 ? '1 month' : `${months} months`;
}

export function foundingHeadline(offer: FoundingOffer): string {
  return `First ${offer.capacity.toLocaleString('en-GH')} vendors get a fee cut for ${monthsLabel(
    offer.feeFreeMonths,
  )}`;
}

export function foundingDescription(offer: FoundingOffer): string {
  return `A fee cut for ${monthsLabel(
    offer.feeFreeMonths,
  )}, a ${offer.badge} badge and a direct line to the team. Be early. Shape it. Keep the perks.`;
}
