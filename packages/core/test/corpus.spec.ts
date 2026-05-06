/**
 * Corpus verification: load every XML file from the upstream
 * `vendor/recog/xml` submodule and assert that:
 *   1. The XML parses cleanly.
 *   2. Every fingerprint pattern compiles.
 *   3. Every <example> matches its parent pattern.
 *   4. Every expected attribute on an <example> matches the
 *      extracted param value exactly.
 *
 * This is the maximum-coverage validation requested by the project.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { XmlLoader } from '../src/xml-loader.js';
import { Verifier } from '../src/verifier.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const XML_DIR = resolve(__dirname, '..', '..', '..', 'vendor', 'recog', 'xml');

function listXmlFiles(): string[] {
  if (!existsSync(XML_DIR)) {
    return [];
  }
  return readdirSync(XML_DIR)
    .filter((entry) => !entry.startsWith('.'))
    .filter((entry) => extname(entry) === '.xml')
    .filter((entry) => {
      const full = join(XML_DIR, entry);
      return statSync(full).isFile();
    })
    .sort();
}

const files = listXmlFiles();

describe.skipIf(files.length === 0)('Recog XML corpus', () => {
  const loader = new XmlLoader();
  const verifier = new Verifier();

  for (const file of files) {
    const full = join(XML_DIR, file);

    it(`parses and verifies ${file}`, () => {
      const db = loader.loadFile(full);
      const report = verifier.verifyDb(db);

      if (report.failed > 0) {
        const failures = report.results
          .filter((r) => !r.ok)
          .slice(0, 5)
          .map(
            (r) =>
              `  - fp#${r.fingerprintIndex} ex#${r.exampleIndex} ` +
              `[${r.description}]: ${r.message ?? ''}` +
              (r.mismatches !== undefined && r.mismatches.length > 0
                ? `\n      mismatches: ${r.mismatches
                    .map(
                      (m) =>
                        `${m.key} expected="${m.expected}" actual="${m.actual ?? '<undefined>'}"`,
                    )
                    .join('; ')}`
                : ''),
          )
          .join('\n');
        throw new Error(
          `${file}: ${report.failed}/${report.total} verification failures\n${failures}`,
        );
      }
      expect(report.failed).toBe(0);
    });
  }
});
