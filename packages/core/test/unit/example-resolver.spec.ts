import { describe, expect, it } from 'vitest';
import { ExampleResolver } from '../../src/example-resolver.js';
import { XmlParseError } from '../../src/errors.js';

describe('ExampleResolver', () => {
  it('returns inner text untouched without encoding', () => {
    const r = new ExampleResolver(undefined);
    expect(r.resolve('hello', undefined, undefined)).toBe('hello');
  });

  it('decodes base64 stripping whitespace', () => {
    const r = new ExampleResolver(undefined);
    expect(r.resolve('aGVs\n  bG8=', 'base64', undefined)).toBe('hello');
  });

  it('throws on unsupported encoding', () => {
    const r = new ExampleResolver(undefined);
    expect(() => r.resolve('x', 'rot13', undefined)).toThrow(XmlParseError);
  });

  it('rejects absolute _filename values', () => {
    const r = new ExampleResolver('/tmp/sample.xml');
    expect(() => r.resolve('', undefined, '/etc/passwd')).toThrow(XmlParseError);
  });

  it('rejects parent-traversal _filename values', () => {
    const r = new ExampleResolver('/tmp/sample.xml');
    expect(() => r.resolve('', undefined, '../../etc/passwd')).toThrow(XmlParseError);
  });

  it('throws when no XML file path context is available', () => {
    const r = new ExampleResolver(undefined);
    expect(() => r.resolve('', undefined, 'file1')).toThrow(XmlParseError);
  });
});
