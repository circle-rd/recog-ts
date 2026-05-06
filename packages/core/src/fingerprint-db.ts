import type { Fingerprint } from './fingerprint.js';
import type { FingerprintDbMeta, MatchResult } from './types.js';

/**
 * A collection of {@link Fingerprint} instances loaded from a single
 * Recog XML file, alongside that file's database-level metadata.
 *
 * Single responsibility: own an ordered fingerprint list and dispatch
 * a single match attempt across them, returning the first hit.
 */
export class FingerprintDb {
  public constructor(
    public readonly meta: FingerprintDbMeta,
    public readonly fingerprints: readonly Fingerprint[],
  ) {}

  /**
   * Attempt to match `input` against every fingerprint in declaration
   * order. The first successful match wins; the result is enriched
   * with database-level metadata (`fingerprint_db`, `service.protocol`
   * if any, and `data`).
   */
  public match(input: string): MatchResult | null {
    for (const fp of this.fingerprints) {
      const result = fp.match(input);
      if (result !== null) {
        return this.decorate(result, input);
      }
    }
    return null;
  }

  /**
   * Match every fingerprint and return the first hit. Identical to
   * {@link match} but exposed for explicit clarity.
   */
  public firstMatch(input: string): MatchResult | null {
    return this.match(input);
  }

  private decorate(result: MatchResult, input: string): MatchResult {
    const enriched: Record<string, string> = { ...result };
    enriched['fingerprint_db'] = this.meta.matches ?? this.meta.name;
    if (this.meta.protocol !== undefined && enriched['service.protocol'] === undefined) {
      enriched['service.protocol'] = this.meta.protocol;
    }
    enriched['data'] = input;
    return Object.freeze(enriched);
  }
}
