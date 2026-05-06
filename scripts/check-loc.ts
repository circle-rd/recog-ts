#!/usr/bin/env tsx
/**
 * Enforces the project's file-size budget. Source files (TypeScript,
 * JavaScript, shell, YAML) should aim for 500 lines and never exceed
 * 1000 lines. Markdown and JSON are excluded.
 */
import { readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { readdirSync } from 'node:fs';

const ROOT = resolve(import.meta.dirname, '..');
const TARGET = 500;
const MAX = 1000;

const INCLUDED_EXT = new Set(['.ts', '.js', '.mjs', '.cjs', '.sh', '.yml', '.yaml']);
const EXCLUDED_DIRS = new Set([
  'node_modules',
  'dist',
  'coverage',
  '.git',
  '.kilo',
  'vendor',
  '.nuxt',
  '.output',
]);

const EXCLUDED_FILES = new Set(['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock']);

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.github') {
      continue;
    }
    if (EXCLUDED_DIRS.has(entry.name)) {
      continue;
    }
    if (EXCLUDED_FILES.has(entry.name)) {
      continue;
    }
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.isFile()) {
      if (INCLUDED_EXT.has(extname(entry.name))) {
        out.push(full);
      }
    }
  }
}

function countLines(file: string): number {
  return readFileSync(file, 'utf8').split('\n').length;
}

function main(): void {
  const files: string[] = [];
  walk(ROOT, files);
  const offenders: { file: string; lines: number }[] = [];
  const warnings: { file: string; lines: number }[] = [];
  for (const f of files) {
    if (statSync(f).size === 0) {
      continue;
    }
    const lines = countLines(f);
    if (lines > MAX) {
      offenders.push({ file: relative(ROOT, f), lines });
    } else if (lines > TARGET) {
      warnings.push({ file: relative(ROOT, f), lines });
    }
  }

  for (const { file, lines } of warnings) {
     
    console.warn(`WARN: ${file} has ${lines} lines (target ${TARGET})`);
  }
  if (offenders.length > 0) {
    for (const { file, lines } of offenders) {
       
      console.error(`FAIL: ${file} has ${lines} lines (max ${MAX})`);
    }
    process.exit(1);
  }
   
  console.warn(`OK: scanned ${files.length} files, ${warnings.length} above target, none above ${MAX}`);
}

main();
