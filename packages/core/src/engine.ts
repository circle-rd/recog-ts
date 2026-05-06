import { readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { UnknownDatabaseError } from './errors.js';
import type { FingerprintDb } from './fingerprint-db.js';
import type { MatchResult } from './types.js';
import { XmlLoader } from './xml-loader.js';

/**
 * Top-level entry point for the Recog engine.
 *
 * Single responsibility: maintain a registry of {@link FingerprintDb}
 * instances keyed by database name and dispatch match requests.
 */
export class RecogEngine {
  private readonly dbs = new Map<string, FingerprintDb>();

  public constructor(private readonly loader: XmlLoader = new XmlLoader()) {}

  /** Returns the names of all loaded databases. */
  public dbNames(): readonly string[] {
    return [...this.dbs.keys()].sort();
  }

  /** Returns a loaded database by name. Throws if unknown. */
  public getDb(name: string): FingerprintDb {
    const db = this.dbs.get(name);
    if (db === undefined) {
      throw new UnknownDatabaseError(name);
    }
    return db;
  }

  /** Register an already-loaded database under a given name. */
  public register(db: FingerprintDb): void {
    this.dbs.set(db.meta.name, db);
  }

  /** Load and register a single XML file. */
  public loadFile(filePath: string): FingerprintDb {
    const db = this.loader.loadFile(filePath);
    this.register(db);
    return db;
  }

  /**
   * Load every `*.xml` file in `dirPath` (non-recursive). Files
   * starting with `.` are ignored.
   */
  public loadDirectory(dirPath: string): readonly FingerprintDb[] {
    const entries = readdirSync(dirPath);
    const loaded: FingerprintDb[] = [];
    for (const entry of entries) {
      if (entry.startsWith('.')) {
        continue;
      }
      if (extname(entry) !== '.xml') {
        continue;
      }
      const full = join(dirPath, entry);
      const stat = statSync(full);
      if (!stat.isFile()) {
        continue;
      }
      loaded.push(this.loadFile(full));
    }
    return loaded;
  }

  /** Match `input` against the named database. */
  public match(dbName: string, input: string): MatchResult | null {
    return this.getDb(dbName).match(input);
  }

  /**
   * Match `input` against every loaded database (or a subset),
   * returning the first non-null result per database.
   */
  public matchAll(
    input: string,
    dbNames?: readonly string[],
  ): readonly MatchResult[] {
    const targets = dbNames ?? this.dbNames();
    const results: MatchResult[] = [];
    for (const name of targets) {
      const db = this.dbs.get(name);
      if (db === undefined) {
        throw new UnknownDatabaseError(name);
      }
      const r = db.match(input);
      if (r !== null) {
        results.push(r);
      }
    }
    return results;
  }
}
