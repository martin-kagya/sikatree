import { describe, expect, it } from 'vitest';
import { safeNext } from '@/lib/safe-next';

describe('safeNext', () => {
  it('keeps same-origin relative paths', () => {
    expect(safeNext('/dashboard/orders')).toBe('/dashboard/orders');
    expect(safeNext('/dashboard/orders?filter=active')).toBe('/dashboard/orders?filter=active');
    expect(safeNext('/dashboard/items/new')).toBe('/dashboard/items/new');
  });

  it('falls back for off-site, auth-loop and malformed values', () => {
    expect(safeNext('https://evil.example')).toBe('/dashboard');
    expect(safeNext('//evil.example')).toBe('/dashboard');
    expect(safeNext('/\\evil.example')).toBe('/dashboard');
    expect(safeNext('/auth/login')).toBe('/dashboard');
    expect(safeNext('/auth/verify?token=x')).toBe('/dashboard');
    expect(safeNext('/dashboard\r\nSet-Cookie: x=1')).toBe('/dashboard');
    expect(safeNext('')).toBe('/dashboard');
    expect(safeNext(null)).toBe('/dashboard');
    expect(safeNext(`/${'a'.repeat(250)}`)).toBe('/dashboard');
  });

  it('supports an empty fallback when storing a link', () => {
    expect(safeNext('https://evil.example', '')).toBe('');
    expect(safeNext('/dashboard/orders', '')).toBe('/dashboard/orders');
  });
});
