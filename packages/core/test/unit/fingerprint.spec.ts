import { describe, expect, it } from 'vitest';
import { Fingerprint } from '../../src/fingerprint.js';

describe('Fingerprint', () => {
  it('returns null on no match', () => {
    const fp = new Fingerprint(/^foo$/, '^foo$', '', 'desc', [], []);
    expect(fp.match('bar')).toBeNull();
  });

  it('extracts capture groups via pos>0', () => {
    const fp = new Fingerprint(
      /^v(\d+)\.(\d+)$/,
      '^v(\\d+)\\.(\\d+)$',
      '',
      'sample',
      [
        { pos: 1, name: 'major' },
        { pos: 2, name: 'minor' },
      ],
      [],
    );
    const r = fp.match('v3.14');
    expect(r).not.toBeNull();
    expect(r?.['major']).toBe('3');
    expect(r?.['minor']).toBe('14');
    expect(r?.['matched']).toBe('sample');
  });

  it('applies static and interpolated values, dropping _tmp.* keys', () => {
    const fp = new Fingerprint(
      /^Eltex (TAU-\d+)$/,
      '',
      '',
      'eltex',
      [
        { pos: 0, name: 'os.vendor', value: 'Eltex' },
        { pos: 1, name: 'hw.product' },
        { pos: 0, name: 'os.product', value: '{hw.product} Firmware' },
        { pos: 0, name: '_tmp.helper', value: 'INTERNAL' },
      ],
      [],
    );
    const r = fp.match('Eltex TAU-72');
    expect(r).not.toBeNull();
    expect(r?.['os.product']).toBe('TAU-72 Firmware');
    expect(r?.['_tmp.helper']).toBeUndefined();
  });
});
