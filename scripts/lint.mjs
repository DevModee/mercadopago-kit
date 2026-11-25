#!/usr/bin/env node
// Zero-dependency lint for mercadopago-kit.
// 1. Syntax-checks every .mjs file under scripts/ and tests/ with `node --check`.
// 2. Parses every .json file in the plugin.
// 3. Rejects em-dash characters in .mjs, .md, and .json files.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, extname, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CODE_DIRS = ['scripts', 'tests'];
const SKIP_DIRS = new Set(['node_modules', '.git']);
const SKIP_FILES = [/^ROADMAP_.*\.md$/, /^CLAUDE\.md$/, /^\.env/];
const TEXT_EXTS = new Set(['.mjs', '.md', '.json']);
const EM_DASH = String.fromCharCode(0x2014);

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) out.push(...walk(join(dir, entry.name)));
    } else if (entry.isFile() && !SKIP_FILES.some((re) => re.test(entry.name))) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

const rel = (file) => relative(ROOT, file).split(sep).join('/');
const problems = [];

const codeFiles = CODE_DIRS.flatMap((d) => walk(join(ROOT, d))).filter((f) => extname(f) === '.mjs');
for (const file of codeFiles) {
  const res = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', windowsHide: true });
  if (res.status !== 0) problems.push(`${rel(file)}: syntax error\n${res.stderr.trim()}`);
}

const textFiles = walk(ROOT).filter((f) => TEXT_EXTS.has(extname(f)));
for (const file of textFiles) {
  const text = readFileSync(file, 'utf8');
  if (extname(file) === '.json') {
    try {
      JSON.parse(text);
    } catch (err) {
      problems.push(`${rel(file)}: invalid JSON (${err.message})`);
    }
  }
  text.split(/\r?\n/).forEach((line, i) => {
    if (line.includes(EM_DASH)) problems.push(`${rel(file)}:${i + 1}: em-dash found`);
  });
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  console.error(`\nlint failed: ${problems.length} problem(s)`);
  process.exit(1);
}

console.log(`lint ok: ${codeFiles.length} module(s) checked, ${textFiles.length} text file(s) scanned`);
