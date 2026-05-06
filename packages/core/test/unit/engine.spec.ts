import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { RecogEngine } from '../../src/engine.js';
import { UnknownDatabaseError } from '../../src/errors.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(__dirname, '..', 'fixtures');

describe('RecogEngine', () => {
  it('loads a directory and matches', () => {
    const engine = new RecogEngine();
    engine.loadDirectory(FIXTURE_DIR);
    expect(engine.dbNames().length).toBeGreaterThan(0);
    const r = engine.match('sample', 'hello world');
    expect(r).not.toBeNull();
  });

  it('throws on unknown db', () => {
    const engine = new RecogEngine();
    expect(() => engine.match('nope', 'x')).toThrow(UnknownDatabaseError);
  });
});
