import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RecogEngine } from '@recog-ts/core';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildMcpServer } from '../src/server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = resolve(__dirname, '..', '..', 'core', 'test', 'fixtures');

let client: Client;

beforeAll(async () => {
  const engine = new RecogEngine();
  engine.loadDirectory(FIXTURE_DIR);
  const server = buildMcpServer(engine);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: 'test-client', version: '1.0.0' });
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
});

afterAll(async () => {
  await client.close();
});

describe('MCP tools', () => {
  it('lists registered tools', async () => {
    const tools = await client.listTools();
    const names = tools.tools.map((t) => t.name).sort();
    expect(names).toEqual([
      'recog.describe_db',
      'recog.list_dbs',
      'recog.match',
      'recog.match_auto',
      'recog.verify_db',
    ]);
  });

  it('calls recog.list_dbs', async () => {
    const r = await client.callTool({ name: 'recog.list_dbs', arguments: {} });
    expect(r.isError).toBeFalsy();
    const text = (r.content as { type: string; text: string }[])[0]?.text ?? '';
    const parsed = JSON.parse(text) as { dbs: { name: string }[] };
    expect(parsed.dbs.find((d) => d.name === 'sample')).toBeDefined();
  });

  it('calls recog.match with a hit', async () => {
    const r = await client.callTool({
      name: 'recog.match',
      arguments: { db: 'sample', data: 'hello world' },
    });
    expect(r.isError).toBeFalsy();
    const text = (r.content as { type: string; text: string }[])[0]?.text ?? '';
    const parsed = JSON.parse(text) as { matched: boolean; result?: Record<string, string> };
    expect(parsed.matched).toBe(true);
    expect(parsed.result?.['greeting.target']).toBe('world');
  });

  it('calls recog.verify_db on the fixture and reports zero failures', async () => {
    const r = await client.callTool({
      name: 'recog.verify_db',
      arguments: { name: 'sample' },
    });
    const text = (r.content as { type: string; text: string }[])[0]?.text ?? '';
    const report = JSON.parse(text) as { failed: number; total: number };
    expect(report.failed).toBe(0);
    expect(report.total).toBeGreaterThan(0);
  });
});
