// First-party funnel analytics (LP-20). No third-party trackers, no cookies:
// a random id in localStorage counts visits, and every event goes to our own
// /api/e endpoint.

const ANON_KEY = 'ska_anon_id';
const ATTRIBUTION_KEY = 'ska_attribution';

export type Attribution = {
  ref: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
};

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function anonId(): string {
  if (typeof window === 'undefined') return '';
  let id = readStorage(ANON_KEY);
  if (!id) {
    id = crypto.randomUUID();
    try {
      window.localStorage.setItem(ANON_KEY, id);
    } catch {
      /* private mode */
    }
  }
  return id;
}

// UTM parameters and the referral code are captured on the first page view and
// kept for the session so the signup can attribute itself.
export function attribution(): Attribution {
  if (typeof window === 'undefined') {
    return { ref: null, utmSource: null, utmMedium: null, utmCampaign: null };
  }

  const empty: Attribution = { ref: null, utmSource: null, utmMedium: null, utmCampaign: null };
  try {
    const stored = window.sessionStorage.getItem(ATTRIBUTION_KEY);
    if (stored) return { ...empty, ...(JSON.parse(stored) as Partial<Attribution>) };
  } catch {
    /* fall through to the URL */
  }

  const params = new URLSearchParams(window.location.search);
  const value = (key: string) => {
    const raw = params.get(key)?.trim();
    return raw ? raw.slice(0, 80) : null;
  };

  const next: Attribution = {
    ref: value('ref')?.toUpperCase() ?? null,
    utmSource: value('utm_source'),
    utmMedium: value('utm_medium'),
    utmCampaign: value('utm_campaign'),
  };

  if (next.ref || next.utmSource || next.utmMedium || next.utmCampaign) {
    try {
      window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
  }
  return next;
}

export function track(name: string, props: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;

  const attrs = attribution();
  const body = JSON.stringify({
    name,
    props,
    path: window.location.pathname,
    referrer: document.referrer || null,
    anonId: anonId(),
    utm: {
      source: attrs.utmSource,
      medium: attrs.utmMedium,
      campaign: attrs.utmCampaign,
    },
  });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/e', new Blob([body], { type: 'application/json' }));
      return;
    }
  } catch {
    /* fall through to fetch */
  }

  void fetch('/api/e', {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json' },
    keepalive: true,
  }).catch(() => {});
}
