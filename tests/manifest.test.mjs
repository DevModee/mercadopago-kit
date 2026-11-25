// Validates the plugin manifest, MCP config, skills, rules, and docs.
// Constraints mirror https://antigravity.google/schemas/v1/plugin.json.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const EM_DASH = String.fromCharCode(0x2014);

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(read(rel));

const ALLOWED_KEYS = new Set([
  '$schema',
  'name',
  'displayName',
  'display_name',
  'description',
  'version',
  'disabled',
  'logo',
  'suggestedPrompts',
  'suggested_prompts',
  'skills',
  'author',
  'homepage',
  'repository',
  'license',
  'keywords',
  'extensions',
  'source',
  'sourcePath',
  'source_path',
]);
const STRING_KEYS = ['displayName', 'display_name', 'description', 'version', 'homepage', 'repository', 'license'];
const NAME_RE = /^[a-zA-Z0-9_-]+$/;
const LOGO_PATH_RE = /^(?![A-Za-z][A-Za-z0-9+.-]*:)(?!\/)\S.*\.([Pp][Nn][Gg]|[Ss][Vv][Gg]|[Jj][Pp][Ee]?[Gg]|[Ww][Ee][Bb][Pp])$/;
const LOGO_URL_RE = /^https:\/\/([A-Za-z0-9-]+\.)*(google\.com|gstatic\.com|googleusercontent\.com)(:[0-9]+)?([/?#].*)?$/;
const SKILL_NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/);
  if (!match) return null;
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (line.trim() === '') continue;
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    assert.ok(kv, `unparseable frontmatter line: ${line}`);
    data[kv[1]] = kv[2].replace(/^(["'])(.*)\1$/, '$2').trim();
  }
  return data;
}

test('plugin.json matches the v1 plugin schema', () => {
  const manifest = readJson('plugin.json');

  assert.equal(typeof manifest.name, 'string');
  assert.match(manifest.name, NAME_RE);
  assert.equal(manifest.name, 'mercadopago-kit');

  for (const key of Object.keys(manifest)) {
    assert.ok(ALLOWED_KEYS.has(key), `unknown top-level key: ${key}`);
  }
  for (const key of STRING_KEYS) {
    if (key in manifest) assert.equal(typeof manifest[key], 'string', `${key} must be a string`);
  }
  assert.equal(typeof manifest.repository, 'string');

  if ('disabled' in manifest) assert.equal(typeof manifest.disabled, 'boolean');
  if ('keywords' in manifest) {
    assert.ok(Array.isArray(manifest.keywords));
    for (const kw of manifest.keywords) assert.equal(typeof kw, 'string');
  }
});

test('plugin.json suggestedPrompts has 1 to 3 non-empty strings', () => {
  const { suggestedPrompts } = readJson('plugin.json');
  assert.ok(Array.isArray(suggestedPrompts));
  assert.ok(suggestedPrompts.length >= 1 && suggestedPrompts.length <= 3, 'expected 1 to 3 prompts');
  for (const prompt of suggestedPrompts) {
    assert.equal(typeof prompt, 'string');
    assert.ok(prompt.trim().length > 0, 'prompt must not be blank');
  }
});

test('plugin.json logo is a valid relative path to an existing file', () => {
  const { logo } = readJson('plugin.json');
  assert.equal(typeof logo, 'string');
  assert.ok(LOGO_PATH_RE.test(logo) || LOGO_URL_RE.test(logo), `logo does not match schema: ${logo}`);
  if (LOGO_PATH_RE.test(logo)) {
    assert.ok(existsSync(join(ROOT, logo)), `logo file missing: ${logo}`);
  }
});

test('plugin.json author uses only name, email, and url', () => {
  const { author } = readJson('plugin.json');
  if (typeof author === 'string') return;
  assert.equal(typeof author, 'object');
  assert.notEqual(author, null);
  for (const [key, value] of Object.entries(author)) {
    assert.ok(['name', 'email', 'url'].includes(key), `unknown author key: ${key}`);
    assert.equal(typeof value, 'string');
  }
});

test('mcp_config.json defines the mercadopago server without hardcoded secrets', () => {
  const config = readJson('mcp_config.json');
  const server = config.mcpServers?.mercadopago;
  assert.ok(server, 'mcpServers.mercadopago is missing');
  assert.equal(typeof server.command, 'string');
  assert.ok(server.command.length > 0);
  assert.ok(Array.isArray(server.args));
  assert.ok(
    server.args.some((arg) => /^mercadopago-mcp@\d+\.\d+\.\d+$/.test(arg)),
    'args must launch mercadopago-mcp pinned to an exact version',
  );

  for (const [key, value] of Object.entries(server.env ?? {})) {
    assert.equal(typeof value, 'string');
    assert.doesNotMatch(value, /^(APP_USR|TEST)-/, `${key} looks like a hardcoded token`);
    if (/TOKEN|SECRET/.test(key)) {
      assert.match(value, /^\$\{?[A-Z_]+\}?$/, `${key} must reference an env var, not a literal`);
    }
  }
});

test('every skill has frontmatter with a hyphenated name and a description', () => {
  const skillsDir = join(ROOT, 'skills');
  const skills = readdirSync(skillsDir).filter((d) => statSync(join(skillsDir, d)).isDirectory());
  assert.deepEqual(skills.sort(), ['checkout-integration', 'payment-debug', 'webhook-verify']);

  for (const dir of skills) {
    const file = `skills/${dir}/SKILL.md`;
    assert.ok(existsSync(join(ROOT, file)), `${file} is missing`);
    const fm = parseFrontmatter(read(file));
    assert.ok(fm, `${file} has no YAML frontmatter`);
    assert.match(fm.name ?? '', SKILL_NAME_RE, `${file} name must be lowercase and hyphenated`);
    assert.equal(fm.name, dir, `${file} name must match its folder`);
    assert.ok((fm.description ?? '').length > 0, `${file} description is empty`);
  }
});

test('rules/AGENTS.md exists, has no frontmatter, and stays small', () => {
  const file = join(ROOT, 'rules', 'AGENTS.md');
  assert.ok(existsSync(file));
  const text = readFileSync(file, 'utf8');
  assert.ok(!text.startsWith('---'), 'rules/AGENTS.md must not have frontmatter');
  assert.ok(Buffer.byteLength(text, 'utf8') < 4000, 'rules/AGENTS.md must stay under 4000 bytes');
  assert.match(text, /mercadopago_account\/balance/, 'balance limitation must be documented');
});

test('LICENSE and README.md exist and contain no em-dashes', () => {
  for (const rel of ['LICENSE', 'README.md']) {
    assert.ok(existsSync(join(ROOT, rel)), `${rel} is missing`);
    assert.ok(!read(rel).includes(EM_DASH), `${rel} contains an em-dash`);
  }
});
