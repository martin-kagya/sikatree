// Validate a post-sign-in destination before storing or redirecting to it.
// Only a same-origin relative path is allowed; auth paths are excluded so a
// sign-in cannot loop back into /auth/*.
export function safeNext(raw: string | null | undefined, fallback = '/dashboard'): string {
  const value = (raw ?? '').trim();
  if (!value || value.length > 200) return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  if (value.includes('\\')) return fallback;
  if (value.startsWith('/auth/')) return fallback;
  return value;
}
