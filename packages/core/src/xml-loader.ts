import { readFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { XmlParseError } from './errors.js';
import { ExampleResolver } from './example-resolver.js';
import { Fingerprint } from './fingerprint.js';
import { FingerprintDb } from './fingerprint-db.js';
import { RegexFactory } from './regex-factory.js';
import type { ExampleSpec, FingerprintDbMeta, ParamSpec } from './types.js';

interface XmlAttributes {
  readonly [key: string]: string;
}

interface XmlNode {
  readonly [key: string]: unknown;
}

/**
 * Loads a Recog XML fingerprint file into a {@link FingerprintDb}.
 *
 * Single responsibility: XML parsing and structural validation.
 * Regex compilation is delegated to {@link RegexFactory}; example
 * decoding to {@link ExampleResolver}.
 */
export class XmlLoader {
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: false,
    trimValues: false,
    isArray: (name) => name === 'fingerprint' || name === 'example' || name === 'param',
    processEntities: true,
  });

  public constructor(private readonly regexFactory: RegexFactory = new RegexFactory()) {}

  /** Load and parse a fingerprint database from a file path. */
  public loadFile(filePath: string): FingerprintDb {
    const xml = readFileSync(filePath, 'utf8');
    return this.loadString(xml, filePath);
  }

  /**
   * Load and parse a fingerprint database from an in-memory XML
   * string. The optional `filePath` is used to resolve sibling
   * example files via `_filename` and to enrich error messages.
   */
  public loadString(xml: string, filePath?: string): FingerprintDb {
    const parsed = this.safeParse(xml, filePath);
    const root = parsed['fingerprints'];
    if (!this.isObject(root)) {
      throw new XmlParseError('Missing <fingerprints> root element', filePath);
    }

    const meta = this.parseMeta(root, filePath);
    const fingerprintNodes = this.toArray(root['fingerprint']);
    const resolver = new ExampleResolver(filePath);
    const fingerprints = fingerprintNodes.map((node, idx) =>
      this.parseFingerprint(node, idx, filePath, resolver),
    );

    return new FingerprintDb(meta, fingerprints);
  }

  private safeParse(xml: string, filePath: string | undefined): XmlNode {
    try {
      const out = this.parser.parse(xml);
      if (!this.isObject(out)) {
        throw new XmlParseError('XML root is not an object', filePath);
      }
      return out;
    } catch (cause) {
      if (cause instanceof XmlParseError) {
        throw cause;
      }
      throw new XmlParseError(
        `Failed to parse XML: ${cause instanceof Error ? cause.message : String(cause)}`,
        filePath,
      );
    }
  }

  private parseMeta(root: XmlNode, filePath: string | undefined): FingerprintDbMeta {
    const attrs = this.attrs(root);
    const matches = attrs['matches'];
    const name =
      filePath !== undefined ? basename(filePath, extname(filePath)) : matches ?? 'unnamed';
    const meta: {
      matches?: string;
      name: string;
      protocol?: string;
      databaseType?: string;
      preference?: number;
    } = { name };
    if (matches !== undefined) {
      meta.matches = matches;
    }
    if (attrs['protocol'] !== undefined) {
      meta.protocol = attrs['protocol'];
    }
    if (attrs['database_type'] !== undefined) {
      meta.databaseType = attrs['database_type'];
    }
    const pref = attrs['preference'];
    if (pref !== undefined) {
      const num = Number(pref);
      if (Number.isNaN(num)) {
        throw new XmlParseError(`Invalid preference value: ${pref}`, filePath);
      }
      meta.preference = num;
    }
    return meta;
  }

  private parseFingerprint(
    node: unknown,
    index: number,
    filePath: string | undefined,
    resolver: ExampleResolver,
  ): Fingerprint {
    if (!this.isObject(node)) {
      throw new XmlParseError(`Fingerprint #${index} is not an object`, filePath);
    }
    const attrs = this.attrs(node);
    const pattern = attrs['pattern'];
    if (pattern === undefined) {
      throw new XmlParseError(
        `Fingerprint #${index} missing required \`pattern\` attribute`,
        filePath,
      );
    }
    const flags = attrs['flags'] ?? '';

    const description = this.textOf(node['description']) ?? '';
    const params = this.toArray(node['param']).map((p, pi) =>
      this.parseParam(p, index, pi, filePath),
    );
    const examples = this.toArray(node['example']).map((e) =>
      this.parseExample(e, resolver),
    );

    const regex = this.regexFactory.compile(pattern, flags);
    return new Fingerprint(regex, pattern, flags, description, params, examples);
  }

  private parseParam(
    node: unknown,
    fpIndex: number,
    paramIndex: number,
    filePath: string | undefined,
  ): ParamSpec {
    if (!this.isObject(node)) {
      throw new XmlParseError(
        `Fingerprint #${fpIndex} param #${paramIndex} is not an object`,
        filePath,
      );
    }
    const attrs = this.attrs(node);
    const posStr = attrs['pos'];
    const name = attrs['name'];
    if (posStr === undefined) {
      throw new XmlParseError(
        `Fingerprint #${fpIndex} param #${paramIndex} missing \`pos\``,
        filePath,
      );
    }
    if (name === undefined) {
      throw new XmlParseError(
        `Fingerprint #${fpIndex} param #${paramIndex} missing \`name\``,
        filePath,
      );
    }
    const pos = Number.parseInt(posStr, 10);
    if (!Number.isFinite(pos) || pos < 0) {
      throw new XmlParseError(
        `Fingerprint #${fpIndex} param #${paramIndex} invalid pos="${posStr}"`,
        filePath,
      );
    }
    const value = attrs['value'];
    if (value !== undefined) {
      return { pos, name, value };
    }
    return { pos, name };
  }

  private parseExample(node: unknown, resolver: ExampleResolver): ExampleSpec {
    if (!this.isObject(node)) {
      // Allow scalar-ish examples (rare): coerce to string.
      const txt = node === undefined || node === null ? '' : String(node);
      return Object.freeze({ text: txt, expected: Object.freeze({}), encoding: 'utf8' });
    }
    const attrs = this.attrs(node);
    const inner = this.textOf(node['#text']) ?? '';
    const encodingAttr = attrs['_encoding'];
    const filename = attrs['_filename'];
    const text = resolver.resolve(inner, encodingAttr, filename);

    const expected: Record<string, string> = {};
    for (const [k, v] of Object.entries(attrs)) {
      if (k.startsWith('_')) {
        continue;
      }
      expected[k] = v;
    }

    const encoding: 'utf8' | 'base64' = encodingAttr === 'base64' ? 'base64' : 'utf8';
    const spec: ExampleSpec =
      filename !== undefined
        ? { text, expected: Object.freeze(expected), encoding, filename }
        : { text, expected: Object.freeze(expected), encoding };
    return Object.freeze(spec);
  }

  private isObject(value: unknown): value is XmlNode {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private attrs(node: XmlNode): XmlAttributes {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith('@_')) {
        out[k.slice(2)] = String(v);
      }
    }
    return out;
  }

  private textOf(value: unknown): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (this.isObject(value)) {
      const t = value['#text'];
      if (typeof t === 'string') {
        return t;
      }
    }
    return undefined;
  }

  private toArray(value: unknown): unknown[] {
    if (value === undefined || value === null) {
      return [];
    }
    if (Array.isArray(value)) {
      return value;
    }
    return [value];
  }
}
