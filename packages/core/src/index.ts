/**
 * Public API of `@recog-ts/core`.
 *
 * @packageDocumentation
 */

export * from './types.js';
export * from './errors.js';
export { decodeBanner, type BannerEncoding } from './banner.js';
export { parseFlags, getFlagMap } from './flags.js';
export { RegexFactory } from './regex-factory.js';
export { Interpolator, type FieldResolver } from './interpolator.js';
export { Fingerprint } from './fingerprint.js';
export { FingerprintDb } from './fingerprint-db.js';
export { ExampleResolver } from './example-resolver.js';
export { XmlLoader } from './xml-loader.js';
export { RecogEngine } from './engine.js';
export {
  Verifier,
  type DbVerificationReport,
  type ExampleVerificationResult,
} from './verifier.js';
