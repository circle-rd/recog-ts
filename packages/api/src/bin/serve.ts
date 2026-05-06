#!/usr/bin/env node
/**
 * Binary entry point for the recog-ts REST API.
 *
 * Configuration is read from environment variables:
 *   - `RECOG_TS_XML_DIR` — path to the directory containing fingerprint
 *     XML files. Defaults to `vendor/recog/xml` relative to the cwd.
 *   - `RECOG_TS_API_HOST` — bind host (default `0.0.0.0`).
 *   - `RECOG_TS_API_PORT` — bind port (default `3000`).
 */
import { resolve } from 'node:path';
import { buildEngineFromDirectory } from '../engine-singleton.js';
import { buildServer } from '../server.js';

async function main(): Promise<void> {
  const xmlDir = resolve(process.env['RECOG_TS_XML_DIR'] ?? 'vendor/recog/xml');
  const host = process.env['RECOG_TS_API_HOST'] ?? '0.0.0.0';
  const portStr = process.env['RECOG_TS_API_PORT'] ?? '3000';
  const port = Number.parseInt(portStr, 10);
  if (!Number.isFinite(port)) {
    throw new Error(`Invalid RECOG_TS_API_PORT="${portStr}"`);
  }

  const engine = buildEngineFromDirectory(xmlDir);
  const app = await buildServer({ engine, logger: true });
  await app.listen({ host, port });
}

void main();
