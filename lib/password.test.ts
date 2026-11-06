import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPasswordHash } from '@/lib/password';

describe('password hashing', () => {
  it('round-trips a password', () => {
    const stored = hashPassword('admin@sikaTree');
    expect(stored.startsWith('scrypt$')).toBe(true);
    expect(verifyPasswordHash('admin@sikaTree', stored)).toBe(true);
    expect(verifyPasswordHash('admin@sikatree', stored)).toBe(false);
  });

  it('rejects malformed hashes', () => {
    expect(verifyPasswordHash('x', 'plaintext')).toBe(false);
    expect(verifyPasswordHash('x', 'scrypt$$')).toBe(false);
    expect(verifyPasswordHash('x', 'scrypt$abc$')).toBe(false);
  });

  it('salts each hash', () => {
    expect(hashPassword('same')).not.toBe(hashPassword('same'));
  });
});
