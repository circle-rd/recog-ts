import { describe, expect, it } from 'vitest';
import { XmlLoader } from '../../src/xml-loader.js';
import { XmlParseError } from '../../src/errors.js';

const SAMPLE = `<?xml version='1.0' encoding='UTF-8'?>
<fingerprints matches="ssh.banner" protocol="ssh">
  <fingerprint pattern="^RomSShell_([\\d\\.]+)$">
    <description>Allegro RomSShell SSH</description>
    <example service.version="4.62">RomSShell_4.62</example>
    <param pos="0" name="service.vendor" value="Allegro"/>
    <param pos="0" name="service.product" value="RomSShell"/>
    <param pos="1" name="service.version"/>
  </fingerprint>
</fingerprints>`;

describe('XmlLoader', () => {
  const loader = new XmlLoader();

  it('parses a simple fingerprints document', () => {
    const db = loader.loadString(SAMPLE);
    expect(db.meta.matches).toBe('ssh.banner');
    expect(db.meta.protocol).toBe('ssh');
    expect(db.fingerprints).toHaveLength(1);
    const fp = db.fingerprints[0];
    expect(fp).toBeDefined();
    expect(fp?.description).toBe('Allegro RomSShell SSH');
    expect(fp?.params).toHaveLength(3);
    expect(fp?.examples[0]?.text).toBe('RomSShell_4.62');
    expect(fp?.examples[0]?.expected['service.version']).toBe('4.62');
  });

  it('matches via FingerprintDb and decorates with metadata', () => {
    const db = loader.loadString(SAMPLE);
    const r = db.match('RomSShell_4.62');
    expect(r).not.toBeNull();
    expect(r?.['service.version']).toBe('4.62');
    expect(r?.['service.protocol']).toBe('ssh');
    expect(r?.['fingerprint_db']).toBe('ssh.banner');
    expect(r?.['data']).toBe('RomSShell_4.62');
  });

  it('throws XmlParseError when matches attribute is missing', () => {
    const xml = `<?xml version='1.0'?><fingerprints></fingerprints>`;
    expect(() => loader.loadString(xml)).toThrow(XmlParseError);
  });

  it('decodes base64 examples', () => {
    const xml = `<?xml version='1.0'?>
<fingerprints matches="x.y">
  <fingerprint pattern="^hello$">
    <description>d</description>
    <example _encoding="base64">aGVsbG8=</example>
    <param pos="0" name="k" value="v"/>
  </fingerprint>
</fingerprints>`;
    const db = loader.loadString(xml);
    expect(db.fingerprints[0]?.examples[0]?.text).toBe('hello');
  });
});
