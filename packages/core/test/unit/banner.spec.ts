import { describe, expect, it } from 'vitest';
import { decodeBanner } from '../../src/banner.js';

describe('decodeBanner', () => {
  it('returns input unchanged when encoding is omitted', () => {
    expect(decodeBanner('hello', undefined)).toBe('hello');
  });

  it('returns input unchanged when encoding is utf8', () => {
    expect(decodeBanner('hello', 'utf8')).toBe('hello');
  });

  it('decodes base64 input as latin1 to preserve binary bytes', () => {
    const data = Buffer.from([0x68, 0x69, 0x00, 0xff]).toString('base64');
    const out = decodeBanner(data, 'base64');
    expect(out).toHaveLength(4);
    expect(out.charCodeAt(2)).toBe(0);
    expect(out.charCodeAt(3)).toBe(0xff);
  });
});
