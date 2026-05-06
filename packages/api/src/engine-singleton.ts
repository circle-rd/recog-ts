import { RecogEngine } from '@recog-ts/core';

/**
 * Convenience builder used by the binary entry point: constructs a
 * fresh `RecogEngine` populated with every XML file in `xmlDir`.
 *
 * The engine is not stored anywhere by this helper; the caller is
 * responsible for passing it into {@link buildServer}, which keeps a
 * per-instance reference (no module-level globals).
 */
export function buildEngineFromDirectory(xmlDir: string): RecogEngine {
  const engine = new RecogEngine();
  engine.loadDirectory(xmlDir);
  return engine;
}
