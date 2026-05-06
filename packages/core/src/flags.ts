import { UnknownFlagError } from './errors.js';

/**
 * Mapping between Recog flag names and JavaScript `RegExp` flags.
 *
 * Recog (Ruby/Onigmo) flag set is documented at
 * https://www.rubydoc.info/gems/recog/Recog/Fingerprint/RegexpFactory#FLAG_MAP-constant
 *
 * `REG_LINE_ANY_CRLF` does not have a direct JS counterpart; we model
 * it by enabling multiline (`m`) which is the closest semantic match
 * for the patterns currently shipped by the upstream Recog corpus.
 */
const FLAG_MAP: Readonly<Record<string, string>> = Object.freeze({
  REG_ICASE: 'i',
  // Recog inherits Ruby/Onigmo semantics where `m` = "DOTALL" (the
  // dot matches newlines). The JS equivalent is the `s` flag.
  REG_MULTILINE: 's',
  REG_DOT_NEWLINE: 's',
  // No precise JS equivalent; treat as `s` (closest behaviour for
  // the upstream corpus).
  REG_LINE_ANY_CRLF: 's',
});

/**
 * Parses a comma- or whitespace-separated Recog flag string into a
 * deduplicated JavaScript regex flag string.
 *
 * @throws {UnknownFlagError} If a flag name is not recognised.
 */
export function parseFlags(input: string | undefined): string {
  if (input === undefined || input.trim() === '') {
    return '';
  }

  const tokens = input
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  const collected = new Set<string>();
  for (const token of tokens) {
    const mapped = FLAG_MAP[token];
    if (mapped === undefined) {
      throw new UnknownFlagError(token);
    }
    for (const ch of mapped) {
      collected.add(ch);
    }
  }

  return [...collected].join('');
}

/** Returns a frozen copy of the underlying flag map (for diagnostics). */
export function getFlagMap(): Readonly<Record<string, string>> {
  return FLAG_MAP;
}
