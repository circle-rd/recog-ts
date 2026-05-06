import { describe, expect, it } from 'vitest';
import { RegexFactory } from '../../src/regex-factory.js';
import { RegexCompileError } from '../../src/errors.js';

describe('RegexFactory', () => {
  const factory = new RegexFactory();

  it('compiles a basic pattern with no flags', () => {
    const r = factory.compile('^hello$', undefined);
    expect(r.test('hello')).toBe(true);
    expect(r.test('Hello')).toBe(false);
  });

  it('honours REG_ICASE', () => {
    const r = factory.compile('^hello$', 'REG_ICASE');
    expect(r.test('Hello')).toBe(true);
  });

  it('throws RegexCompileError on invalid pattern', () => {
    expect(() => factory.compile('(', '')).toThrow(RegexCompileError);
  });

  it('promotes inline (?i) modifiers from anywhere in the pattern', () => {
    const r = factory.compile('^(?i)hello$', undefined);
    expect(r.test('HELLO')).toBe(true);
  });

  it('rewrites (?ms:...) into (?:...) and applies dotall', () => {
    const r = factory.compile('(?m:foo.bar)', undefined);
    expect(r.test('foo\nbar')).toBe(true);
  });

  it('translates \\A and \\z into string anchors that ignore line breaks', () => {
    const r = factory.compile('\\Ahello\\z', undefined);
    expect(r.test('hello')).toBe(true);
    // \\A and \\z must not allow matching on later lines, even with `m`
    expect(r.test('intro\nhello')).toBe(false);
    expect(r.test('hello\ntrailing')).toBe(false);
  });

  it('keeps `.` matching `\\r` (Ruby semantics) but not `\\n`', () => {
    const r = factory.compile('a.b', undefined);
    expect(r.test('a\rb')).toBe(true);
    expect(r.test('a\nb')).toBe(false);
  });

  it('does not strip flag-like text inside a character class', () => {
    const r = factory.compile('[(?i)]', undefined);
    expect(r.test('?')).toBe(true);
    expect(r.test('i')).toBe(true);
    expect(r.test(')')).toBe(true);
  });
});
