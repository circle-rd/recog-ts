/**
 * Public type definitions for the Recog engine.
 *
 * @packageDocumentation
 */

/**
 * The map of values produced by a successful fingerprint match.
 *
 * Keys come from `<param name="...">` declarations plus engine-added
 * metadata such as `matched`, `fingerprint_db`, and `data`.
 *
 * Keys starting with `_tmp.` are stripped before being returned.
 */
export type MatchResult = Readonly<Record<string, string>>;

/**
 * A single `<param>` element parsed from a fingerprint definition.
 */
export interface ParamSpec {
  /** Capture group index. `0` denotes a static value. */
  readonly pos: number;
  /** Output field name. */
  readonly name: string;
  /**
   * Optional literal value. When `pos === 0` this is required; when
   * `pos > 0` it is used as a template overriding the captured value
   * if both are present.
   */
  readonly value?: string;
}

/**
 * A single `<example>` element parsed from a fingerprint definition.
 */
export interface ExampleSpec {
  /** The decoded example text. */
  readonly text: string;
  /** Optional asserted parameter values keyed by param name. */
  readonly expected: Readonly<Record<string, string>>;
  /** Original encoding declaration, kept for diagnostics. */
  readonly encoding: 'utf8' | 'base64';
  /** Original `_filename` attribute if present. */
  readonly filename?: string;
}

/**
 * Database-level metadata pulled from `<fingerprints>` attributes.
 */
export interface FingerprintDbMeta {
  /** `matches="..."` attribute, e.g. `ftp.banner`. Optional in the upstream corpus. */
  readonly matches?: string;
  /** Optional `protocol="..."` attribute. */
  readonly protocol?: string;
  /** Optional `database_type="..."` attribute. */
  readonly databaseType?: string;
  /** Optional `preference="..."` attribute. */
  readonly preference?: number;
  /** Logical name of the database (typically the XML file basename). */
  readonly name: string;
}

/**
 * A serialised view of a fingerprint, useful for diagnostics and APIs.
 */
export interface FingerprintView {
  readonly pattern: string;
  readonly flags: string;
  readonly description: string;
  readonly params: readonly ParamSpec[];
  readonly examples: readonly ExampleSpec[];
}
