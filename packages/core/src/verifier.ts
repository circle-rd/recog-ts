import type { Fingerprint } from './fingerprint.js';
import type { FingerprintDb } from './fingerprint-db.js';
import type { ExampleSpec } from './types.js';

/** Outcome of verifying a single example. */
export interface ExampleVerificationResult {
  readonly fingerprintIndex: number;
  readonly exampleIndex: number;
  readonly description: string;
  readonly ok: boolean;
  readonly message?: string;
  readonly mismatches?: ReadonlyArray<{
    readonly key: string;
    readonly expected: string;
    readonly actual: string | undefined;
  }>;
}

/** Aggregate report of verifying a database. */
export interface DbVerificationReport {
  readonly db: string;
  readonly total: number;
  readonly failed: number;
  readonly results: readonly ExampleVerificationResult[];
}

/**
 * Validates that a {@link FingerprintDb} is internally consistent:
 * every example matches its pattern and yields the expected param
 * values.
 *
 * Single responsibility: verification. Pure inspection — never
 * throws on a verification failure (errors are surfaced via the
 * report). Structural errors at parse time are surfaced earlier by
 * the loader.
 */
export class Verifier {
  /** Verify a whole database. */
  public verifyDb(db: FingerprintDb): DbVerificationReport {
    const results: ExampleVerificationResult[] = [];
    let failed = 0;
    db.fingerprints.forEach((fp, fpIdx) => {
      fp.examples.forEach((ex, exIdx) => {
        const r = this.verifyExample(fp, ex, fpIdx, exIdx);
        results.push(r);
        if (!r.ok) {
          failed += 1;
        }
      });
    });
    return {
      db: db.meta.name,
      total: results.length,
      failed,
      results,
    };
  }

  /** Verify a single example against its parent fingerprint. */
  public verifyExample(
    fp: Fingerprint,
    example: ExampleSpec,
    fingerprintIndex: number,
    exampleIndex: number,
  ): ExampleVerificationResult {
    const m = fp.regex.exec(example.text);
    if (m === null) {
      return {
        fingerprintIndex,
        exampleIndex,
        description: fp.description,
        ok: false,
        message: `Example does not match pattern /${fp.pattern}/${fp.flags}`,
      };
    }
    const extracted = fp.extract(m);
    const mismatches: { key: string; expected: string; actual: string | undefined }[] = [];
    for (const [k, expected] of Object.entries(example.expected)) {
      const actual = extracted[k];
      if (actual !== expected) {
        mismatches.push({ key: k, expected, actual });
      }
    }
    if (mismatches.length > 0) {
      return {
        fingerprintIndex,
        exampleIndex,
        description: fp.description,
        ok: false,
        message: `Example produced mismatched param values`,
        mismatches,
      };
    }
    return {
      fingerprintIndex,
      exampleIndex,
      description: fp.description,
      ok: true,
    };
  }
}
