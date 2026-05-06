import type { ExampleSpec, FingerprintView, MatchResult, ParamSpec } from './types.js';
import { Interpolator, hasPlaceholder } from './interpolator.js';

/**
 * Represents a single `<fingerprint>` definition: a compiled regex,
 * the description, the parameter list and the examples.
 *
 * Single responsibility: own the matching and extraction logic for
 * exactly one fingerprint.
 */
export class Fingerprint {
  private readonly interpolator = new Interpolator();

  public constructor(
    public readonly regex: RegExp,
    public readonly pattern: string,
    public readonly flags: string,
    public readonly description: string,
    public readonly params: readonly ParamSpec[],
    public readonly examples: readonly ExampleSpec[],
  ) {}

  /**
   * Try to match the input against the fingerprint regex. Returns
   * `null` on no-match, otherwise an immutable map of extracted
   * fields (excluding `_tmp.*` helper keys).
   */
  public match(input: string): MatchResult | null {
    const m = this.regex.exec(input);
    if (m === null) {
      return null;
    }
    return this.extract(m);
  }

  /**
   * Extract field values given a regex match. Exposed for testing.
   */
  public extract(match: RegExpExecArray): MatchResult {
    // Pass 1: collect raw values directly available without
    // interpolation. Capture-only params (pos > 0, no static value)
    // come from the regex match. Static params with no `{...}`
    // placeholder are inserted as-is.
    const raw = new Map<string, string>();
    const templates = new Map<string, string>();

    for (const param of this.params) {
      // Mirror upstream Recog semantics: a non-empty `value`
      // attribute always wins; an empty `value` is treated as
      // absent so the capture group at `pos` is used. When `pos>0`
      // and there is no overriding `value`, the captured substring
      // (or `""` if the group is optional and did not match) is
      // recorded.
      const hasStatic = param.value !== undefined && param.value !== '';
      if (hasStatic) {
        const v = param.value as string;
        if (hasPlaceholder(v)) {
          templates.set(param.name, v);
        } else {
          raw.set(param.name, v);
        }
      } else if (param.pos > 0) {
        const captured = match[param.pos] ?? '';
        raw.set(param.name, captured);
      }
    }

    // Pass 2: resolve templated values with interpolation. The
    // Interpolator handles nested expansion and cycle detection by
    // recursing into raw values; templates may reference each other
    // and are resolved on-demand.
    const resolve = (field: string): string | undefined => {
      if (raw.has(field)) {
        return raw.get(field);
      }
      const tpl = templates.get(field);
      if (tpl !== undefined) {
        return tpl;
      }
      return undefined;
    };

    for (const [name, tpl] of templates) {
      raw.set(name, this.interpolator.expand(tpl, resolve));
    }

    // Strip _tmp.* and freeze.
    const out: Record<string, string> = {};
    for (const [k, v] of raw) {
      if (!k.startsWith('_tmp.')) {
        out[k] = v;
      }
    }
    out['matched'] = this.description;
    return Object.freeze(out);
  }


  /** Returns a serialisable view of this fingerprint. */
  public toView(): FingerprintView {
    return {
      pattern: this.pattern,
      flags: this.flags,
      description: this.description,
      params: this.params,
      examples: this.examples,
    };
  }
}
