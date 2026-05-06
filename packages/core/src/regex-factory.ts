import { RegexCompileError } from './errors.js';
import { parseFlags } from './flags.js';

interface TranslationResult {
  readonly pattern: string;
  readonly extraFlags: string;
}

/**
 * Factory responsible for turning Recog `(pattern, flags)` pairs into
 * compiled JavaScript `RegExp` instances.
 *
 * Single responsibility: regex compilation, including any pattern
 * pre-processing required to bridge the Onigmo/JS gap.
 */
export class RegexFactory {
  /**
   * Compile a Recog regular expression.
   *
   * @param pattern - The raw regex pattern string from the XML.
   * @param flags - The space/comma separated Recog flag names.
   * @throws {RegexCompileError} If compilation fails.
   */
  public compile(pattern: string, flags: string | undefined): RegExp {
    const baseFlags = parseFlags(flags);
    const dotallActive = baseFlags.includes('s');
    const { pattern: translated, extraFlags } = this.translate(pattern, dotallActive);
    // Bridge Ruby/Onigmo and JS regex semantics:
    //
    // Ruby's `^`/`$` are always line anchors — equivalent to JS's
    // `m` flag. We force `m` so Recog patterns behave the way they
    // were authored. String anchors (`\A`, `\z`, `\Z`) are translated
    // separately into lookbehind/lookahead constructs so they keep
    // their start/end-of-string meaning irrespective of `m`.
    const flagSet = new Set<string>([...baseFlags, ...extraFlags, 'm']);
    const jsFlags = [...flagSet].join('');
    try {
      return new RegExp(translated, jsFlags);
    } catch (cause) {
      throw new RegexCompileError(pattern, jsFlags, cause);
    }
  }

  /**
   * Translate Onigmo-isms in a pattern into JavaScript-compatible
   * equivalents.
   *
   * - `(?ims)` flag-only modifiers anywhere in the pattern are
   *   stripped and their flags promoted into the global flag set.
   * - `(?ims:...)` scoped modifiers become `(?:...)` and likewise
   *   contribute their flags.
   * - `\A` / `\z` / `\Z` are rewritten using lookbehind/lookahead so
   *   they retain string-anchor semantics under JS's `m` flag.
   * - Bare `.` is rewritten to `[^\n]` to mirror Ruby's default,
   *   unless DOTALL is requested via flags or an inline modifier.
   *
   * The walk skips occurrences inside character classes or after a
   * backslash, so meta-characters that happen to live inside a
   * literal class are left intact.
   */
  private translate(pattern: string, dotallActive: boolean): TranslationResult {
    const extra = new Set<string>();
    const work = this.rewrite(pattern, extra, dotallActive);
    return { pattern: work, extraFlags: [...extra].join('') };
  }

  /** Walks `pattern` once, applying every Onigmo-to-JS translation. */
  private rewrite(pattern: string, extra: Set<string>, dotallActive: boolean): string {
    let out = '';
    let i = 0;
    let inClass = false;
    let classBracketDepth = 0;
    const len = pattern.length;

    while (i < len) {
      const ch = pattern[i];

      // Backslash escape — copy the next char verbatim regardless of
      // class context, except for the Ruby anchors which we expand.
      if (ch === '\\') {
        const next = pattern[i + 1];
        if (!inClass && next === 'A') {
          out += '(?<![\\s\\S])';
          i += 2;
          continue;
        }
        if (!inClass && (next === 'z' || next === 'Z')) {
          out += '(?![\\s\\S])';
          i += 2;
          continue;
        }
        out += '\\' + (next ?? '');
        i += next === undefined ? 1 : 2;
        continue;
      }

      if (inClass) {
        out += ch ?? '';
        if (ch === '[') {
          classBracketDepth += 1;
        } else if (ch === ']') {
          classBracketDepth -= 1;
          if (classBracketDepth === 0) {
            inClass = false;
          }
        }
        i += 1;
        continue;
      }

      if (ch === '[') {
        inClass = true;
        classBracketDepth = 1;
        out += ch;
        i += 1;
        continue;
      }

      // Detect (?ims) and (?ims:…) at the current position only when
      // outside a character class and not preceded by an escape.
      if (ch === '(' && pattern[i + 1] === '?') {
        const consumed = this.tryAbsorbModifier(pattern, i, extra);
        if (consumed !== null) {
          out += consumed.replacement;
          i += consumed.length;
          continue;
        }
      }

      if (ch === '.' && !extra.has('s') && !dotallActive) {
        out += '[^\\n]';
        i += 1;
        continue;
      }

      out += ch ?? '';
      i += 1;
    }

    return out;
  }

  /**
   * If the current position starts an Onigmo modifier group (either
   * `(?ims)` or `(?ims:`), absorb it and return the replacement plus
   * the number of characters consumed. Returns `null` otherwise.
   */
  private tryAbsorbModifier(
    pattern: string,
    start: number,
    extra: Set<string>,
  ): { replacement: string; length: number } | null {
    // Look for `(?` then [imsx]+ then either `)` or `:`.
    let j = start + 2;
    const flagStart = j;
    while (j < pattern.length) {
      const c = pattern[j];
      if (c === 'i' || c === 'm' || c === 's' || c === 'x') {
        j += 1;
        continue;
      }
      break;
    }
    if (j === flagStart) {
      return null;
    }
    const flagSlice = pattern.slice(flagStart, j);
    const term = pattern[j];
    if (term === ')') {
      this.collectFlags(flagSlice, extra);
      return { replacement: '', length: j - start + 1 };
    }
    if (term === ':') {
      this.collectFlags(flagSlice, extra);
      return { replacement: '(?:', length: j - start + 1 };
    }
    return null;
  }

  private collectFlags(modifiers: string, into: Set<string>): void {
    for (const ch of modifiers) {
      if (ch === 'i') {
        into.add('i');
      } else if (ch === 'm' || ch === 's') {
        // Onigmo/Ruby `m` is DOTALL; JS equivalent is `s`.
        into.add('s');
      }
      // 'x' (extended whitespace) has no JS equivalent; whitespace
      // in such patterns is rare in the upstream corpus and would be
      // treated literally — documented limitation.
    }
  }
}
