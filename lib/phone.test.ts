import { describe, expect, it } from 'vitest';
import { formatGhanaPhone, normalizeGhanaPhone } from '@/lib/phone';

describe('normalizeGhanaPhone', () => {
  it('accepts the national formats vendors actually type', () => {
    expect(normalizeGhanaPhone('024 123 4567')).toBe('+233241234567');
    expect(normalizeGhanaPhone('0241234567')).toBe('+233241234567');
    expect(normalizeGhanaPhone('054 123 4567')).toBe('+233541234567');
    expect(normalizeGhanaPhone('+233 24 123 4567')).toBe('+233241234567');
    expect(normalizeGhanaPhone('233241234567')).toBe('+233241234567');
    expect(normalizeGhanaPhone('00233241234567')).toBe('+233241234567');
  });

  it('rejects numbers that cannot be Ghana mobiles', () => {
    expect(normalizeGhanaPhone('')).toBeNull();
    expect(normalizeGhanaPhone('12345')).toBeNull();
    expect(normalizeGhanaPhone('0301234567')).toBeNull(); // landline prefix
    expect(normalizeGhanaPhone('024123456')).toBeNull(); // too short
    expect(normalizeGhanaPhone('02412345678')).toBeNull(); // too long
    expect(normalizeGhanaPhone('0712345678')).toBeNull(); // not a mobile prefix
  });
});

describe('formatGhanaPhone', () => {
  it('renders the number the way a vendor reads it', () => {
    expect(formatGhanaPhone('+233241234567')).toBe('024 123 4567');
  });
});
