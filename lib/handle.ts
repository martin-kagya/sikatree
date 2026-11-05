export const HANDLE_RE = /^[a-z0-9-]{3,24}$/;

// Placeholder reservation list — swap for a real availability check when the
// reserved_handle table exists.
const RESERVED = new Set([
  'shop',
  'store',
  'sika',
  'sikatree',
  'admin',
  'test',
  'www',
  'help',
  'support',
  'api',
]);

export type HandleStatus = 'idle' | 'too-short' | 'invalid' | 'reserved' | 'available';

export function normalizeHandle(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 24);
}

export function suggestHandle(handle: string): string {
  return `${handle}gh`.slice(0, 24);
}

export function checkHandle(handle: string): HandleStatus {
  if (!handle) return 'idle';
  if (!HANDLE_RE.test(handle)) return handle.length < 3 ? 'too-short' : 'invalid';
  if (RESERVED.has(handle)) return 'reserved';
  return 'available';
}
