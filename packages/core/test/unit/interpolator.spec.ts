import { describe, expect, it } from 'vitest';
import { Interpolator } from '../../src/interpolator.js';
import { InterpolationError } from '../../src/errors.js';

describe('Interpolator', () => {
  const it2 = new Interpolator();

  it('expands a single placeholder', () => {
    const map = new Map<string, string>([['hw.product', 'NX1234']]);
    expect(it2.expand('Firmware for {hw.product}', (k) => map.get(k))).toBe(
      'Firmware for NX1234',
    );
  });

  it('expands nested placeholders', () => {
    const map = new Map<string, string>([
      ['a', '{b}'],
      ['b', 'value'],
    ]);
    expect(it2.expand('{a}', (k) => map.get(k))).toBe('value');
  });

  it('throws on unresolved fields', () => {
    expect(() => it2.expand('{missing}', () => undefined)).toThrow(InterpolationError);
  });

  it('detects cycles', () => {
    const map = new Map<string, string>([
      ['a', '{b}'],
      ['b', '{a}'],
    ]);
    expect(() => it2.expand('{a}', (k) => map.get(k))).toThrow(InterpolationError);
  });

  it('returns templates without placeholders untouched', () => {
    expect(it2.expand('plain', () => undefined)).toBe('plain');
  });
});
