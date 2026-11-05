import { describe, expect, it } from 'vitest';
import { isValidReferralCode, newReferralCode, parseReferralCode } from '@/lib/referral';

describe('referral codes', () => {
  it('generates six Crockford characters without ambiguous letters', () => {
    for (let i = 0; i < 50; i++) {
      const code = newReferralCode();
      expect(code).toHaveLength(6);
      expect(code).not.toMatch(/[ILOU]/);
      expect(isValidReferralCode(code)).toBe(true);
    }
  });

  it('forgives lowercase, spaces and lookalike characters', () => {
    expect(parseReferralCode(' ab12cd ')).toBe('AB12CD');
    expect(parseReferralCode('ab-12-cd')).toBe('AB12CD');
    expect(parseReferralCode('0O1I')).toBeNull(); // too short
    expect(parseReferralCode('o0l1i2')).toBe('001112');
  });

  it('rejects codes that cannot be real', () => {
    expect(parseReferralCode('')).toBeNull();
    expect(parseReferralCode(null)).toBeNull();
    expect(parseReferralCode('!!!!!!')).toBeNull();
    expect(parseReferralCode('TOOLONGCODE')).toBeNull();
  });
});
