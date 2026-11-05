export const HANDLE_RE = /^[a-z0-9-]{3,24}$/;

// Handles that would collide with routes, brand or support channels. Onboarding
// must use this same list (LP-11).
const RESERVED = new Set([
  'about',
  'account',
  'admin',
  'api',
  'app',
  'blog',
  'cart',
  'checkout',
  'contact',
  'dashboard',
  'docs',
  'email',
  'help',
  'hello',
  'legal',
  'login',
  'mail',
  'orders',
  'ostra',
  'pay',
  'privacy',
  'shop',
  'sika',
  'sikatree',
  'signup',
  'status',
  'store',
  'support',
  'team',
  'terms',
  'test',
  'www',
]);

// Deliberately short and conservative. Extend with a reviewed list before
// onboarding goes live; this is a placeholder guard, not a full filter.
const BLOCKED_FRAGMENTS = [
  'fuck',
  'shit',
  'bitch',
  'porn',
  'nazi',
  'scam',
  'kwasia',
  'gyimii',
];

export type HandleStatus =
  | 'idle'
  | 'too-short'
  | 'invalid'
  | 'reserved'
  | 'blocked'
  | 'available';

export function normalizeHandle(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
}

export function checkHandle(handle: string): HandleStatus {
  if (!handle) return 'idle';
  if (handle.length < 3) return 'too-short';
  if (!HANDLE_RE.test(handle)) return 'invalid';
  if (RESERVED.has(handle)) return 'reserved';
  if (BLOCKED_FRAGMENTS.some((fragment) => handle.includes(fragment))) return 'blocked';
  return 'available';
}

// Base suggestion shown in the UI; the server appends a suffix if the base is
// already reserved by someone else.
export function suggestHandle(handle: string): string {
  return `${handle}gh`.slice(0, 24).replace(/-+$/, '');
}

export function suggestHandleVariant(handle: string, attempt: number): string {
  const suffix = attempt <= 1 ? 'gh' : String(attempt);
  return `${handle.slice(0, 24 - suffix.length)}${suffix}`;
}
