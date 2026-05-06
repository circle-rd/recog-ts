import { describe, expect, it } from 'vitest';
import { parseFlags, getFlagMap } from '../../src/flags.js';
import { UnknownFlagError } from '../../src/errors.js';

describe('parseFlags', () => {
  it('returns empty string for undefined or empty input', () => {
    expect(parseFlags(undefined)).toBe('');
    expect(parseFlags('')).toBe('');
    expect(parseFlags('   ')).toBe('');
  });

  it('maps a single flag', () => {
    expect(parseFlags('REG_ICASE')).toBe('i');
  });

  it('maps multiple flags split by commas, spaces, or both', () => {
    const r = parseFlags('REG_ICASE, REG_MULTILINE');
    expect(r.split('').sort().join('')).toBe('is');
  });

  it('deduplicates flag characters', () => {
    expect(parseFlags('REG_MULTILINE REG_LINE_ANY_CRLF')).toBe('s');
  });

  it('throws UnknownFlagError for unknown flag names', () => {
    expect(() => parseFlags('REG_BOGUS')).toThrow(UnknownFlagError);
  });

  it('exposes the flag map for diagnostics', () => {
    const map = getFlagMap();
    expect(map['REG_ICASE']).toBe('i');
  });
});
