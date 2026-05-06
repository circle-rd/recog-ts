#!/usr/bin/env node
/**
 * Binary entry point for the recog-ts MCP server.
 *
 * Configuration is read from CLI arguments and environment:
 *   --transport http|sse   (default: http)
 *   --host <addr>          (default: 0.0.0.0)
 *   --port <port>          (default: 8765)
 *   --xml-dir <dir>        (default: vendor/recog/xml)
 *
 * Environment fallbacks:
 *   RECOG_TS_MCP_TRANSPORT, RECOG_TS_MCP_HOST, RECOG_TS_MCP_PORT,
 *   RECOG_TS_XML_DIR
 */
import { resolve } from 'node:path';
import { RecogEngine } from '@recog-ts/core';
import { buildMcpServer } from '../server.js';
import { HttpTransportRunner, type TransportKind } from '../transport.js';

interface CliOptions {
  readonly transport: TransportKind;
  readonly host: string;
  readonly port: number;
  readonly xmlDir: string;
}

function parseArgs(argv: readonly string[]): CliOptions {
  const env = process.env;
  let transport: TransportKind =
    env['RECOG_TS_MCP_TRANSPORT'] === 'sse' ? 'sse' : 'http';
  let host = env['RECOG_TS_MCP_HOST'] ?? '0.0.0.0';
  let port = Number.parseInt(env['RECOG_TS_MCP_PORT'] ?? '8765', 10);
  let xmlDir = env['RECOG_TS_XML_DIR'] ?? 'vendor/recog/xml';

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const next = argv[i + 1];
    if (flag === '--transport' && next !== undefined) {
      if (next !== 'http' && next !== 'sse') {
        throw new Error(`Invalid --transport value: ${next}`);
      }
      transport = next;
      i += 1;
    } else if (flag === '--host' && next !== undefined) {
      host = next;
      i += 1;
    } else if (flag === '--port' && next !== undefined) {
      port = Number.parseInt(next, 10);
      i += 1;
    } else if (flag === '--xml-dir' && next !== undefined) {
      xmlDir = next;
      i += 1;
    }
  }

  if (!Number.isFinite(port)) {
    throw new Error(`Invalid port`);
  }
  return { transport, host, port, xmlDir: resolve(xmlDir) };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const engine = new RecogEngine();
  engine.loadDirectory(options.xmlDir);

  const runner = new HttpTransportRunner(() => buildMcpServer(engine), {
    kind: options.transport,
    host: options.host,
    port: options.port,
  });
  await runner.start();
   
  console.warn(
    `recog-ts MCP listening on ${options.host}:${options.port} (${options.transport}); ` +
      `loaded ${engine.dbNames().length} databases from ${options.xmlDir}`,
  );
}

void main();
