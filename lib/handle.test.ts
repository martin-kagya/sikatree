import { describe, expect, it } from 'vitest';
import {
  checkHandle,
  normalizeHandle,
  suggestHandle,
  suggestHandleVariant,
} from '@/lib/handle';

describe('normalizeHandle', () => {
  it('lowercases, strips junk and collapses dashes', () => {
    expect(normalizeHandle('  Ama’s Glow  ')).toBe('amasglow');
    expect(normalizeHandle('ama--glow')).toBe('ama-glow');
    expect(normalizeHandle('-ama-')).toBe('ama');
    expect(normalizeHandle('a'.repeat(40))).toHaveLength(24);
  });
});

describe('checkHandle', () => {
  it('accepts a plain handle', () => {
    expect(checkHandle('amasglow')).toBe('available');
    expect(checkHandle('ama-2')).toBe('available');
  });

  it('rejects reserved routes and brand words', () => {
    expect(checkHandle('admin')).toBe('reserved');
    expect(checkHandle('sikatree')).toBe('reserved');
    expect(checkHandle('privacy')).toBe('reserved');
  });

  it('rejects short, malformed and blocked handles', () => {
    expect(checkHandle('ab')).toBe('too-short');
    expect(checkHandle('')).toBe('idle');
    expect(checkHandle('has space')).toBe('invalid');
    expect(checkHandle('kwasia1')).toBe('blocked');
  });
});

describe('handle suggestions', () => {
  it('stays within the 24 character limit', () => {
    const long = 'a'.repeat(24);
    expect(suggestHandle(long).length).toBeLessThanOrEqual(24);
    expect(suggestHandleVariant(long, 1).length).toBeLessThanOrEqual(24);
    expect(suggestHandleVariant(long, 12).length).toBeLessThanOrEqual(24);
    expect(suggestHandleVariant('ama', 1)).toBe('amagh');
    expect(suggestHandleVariant('ama', 2)).toBe('ama2');
  });
});
