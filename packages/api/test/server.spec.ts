import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';
import { RecogEngine } from '@recog-ts/core';
import { buildServer } from '../src/server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = resolve(__dirname, '..', '..', 'core', 'test', 'fixtures');

let app: FastifyInstance;

beforeAll(async () => {
  const engine = new RecogEngine();
  engine.loadDirectory(FIXTURE_DIR);
  app = await buildServer({ engine, logger: false, enableDocs: false });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('REST API', () => {
  it('GET /health returns ok and db count', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body['status']).toBe('ok');
    expect(body['dbs']).toBeGreaterThanOrEqual(1);
  });

  it('GET /dbs lists the fixture database', async () => {
    const res = await app.inject({ method: 'GET', url: '/dbs' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { dbs: { name: string; count: number }[] };
    expect(body.dbs.find((d) => d.name === 'sample')).toBeDefined();
  });

  it('GET /dbs/:name returns 404 for unknown', async () => {
    const res = await app.inject({ method: 'GET', url: '/dbs/nope' });
    expect(res.statusCode).toBe(404);
  });

  it('POST /match returns matched=true on hit', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/match',
      payload: { db: 'sample', data: 'hello world' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { matched: boolean; result?: Record<string, string> };
    expect(body.matched).toBe(true);
    expect(body.result?.['greeting.target']).toBe('world');
  });

  it('POST /match returns matched=false on miss', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/match',
      payload: { db: 'sample', data: 'no match here' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()['matched']).toBe(false);
  });

  it('POST /match returns 404 for unknown db', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/match',
      payload: { db: 'unknown', data: 'x' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('POST /match accepts base64-encoded data', async () => {
    const data = Buffer.from('hello world', 'utf8').toString('base64');
    const res = await app.inject({
      method: 'POST',
      url: '/match',
      payload: { db: 'sample', data, encoding: 'base64' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()['matched']).toBe(true);
  });

  it('POST /match/auto returns array of matches', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/match/auto',
      payload: { data: 'hello world' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { matches: { matched: string }[] };
    expect(body.matches.length).toBeGreaterThanOrEqual(1);
  });
});

