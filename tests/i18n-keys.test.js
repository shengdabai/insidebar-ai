// Every message key the extension references by a literal name must exist in the
// default_locale (en). A missing key makes t() fall back to the raw key name, which the
// user then sees as UI text (for example in the confirm() dialogs of the Danger Zone).
// Dynamic keys (variables, template strings) cannot be checked statically and are skipped.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', 'tests', '_locales', '_metadata', 'Screenshots', 'libs', 'data', 'rules', 'icons', '.git', '.omc']);

const manifest = JSON.parse(readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const defaultMessages = JSON.parse(readFileSync(path.join(root, '_locales', manifest.default_locale, 'messages.json'), 'utf8'));
// Chrome treats message names as case-insensitive.
const messages = new Map(Object.entries(defaultMessages).map(([k, v]) => [k.toLowerCase(), v]));

function listFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else if (/\.(js|html)$/.test(name) && !/\.min\.js$/.test(name)) out.push(full);
  }
  return out;
}

// Replace comments with blanks so that example calls in JSDoc are not counted.
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^[ \t]*\/\/.*$/gm, '');
}

// Number of top-level elements of an array literal starting at src[open] === '[' (null if not a literal).
function arrayLength(src, open) {
  let depth = 0;
  let count = 0;
  let sawItem = false;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      const q = c;
      i++;
      while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; i++; }
      sawItem = true;
      continue;
    }
    if ('([{'.includes(c)) { depth++; if (depth > 1) sawItem = true; continue; }
    if (')]}'.includes(c)) { depth--; if (depth === 0) return sawItem ? count + 1 : 0; continue; }
    if (c === ',' && depth === 1) { count++; continue; }
    if (!/\s/.test(c)) sawItem = true;
  }
  return null;
}

function substitutionsNeeded(entry) {
  const text = entry.message.replace(/\$\$/g, '');
  let need = 0;
  for (const m of text.matchAll(/\$(\d)/g)) need = Math.max(need, Number(m[1]));
  for (const m of text.matchAll(/\$([A-Za-z0-9_@]+)\$/g)) {
    const ph = Object.entries(entry.placeholders || {}).find(([name]) => name.toLowerCase() === m[1].toLowerCase());
    for (const c of String(ph?.[1]?.content || '').matchAll(/\$(\d)/g)) need = Math.max(need, Number(c[1]));
  }
  return need;
}

const refs = [];
for (const file of listFiles(root)) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  const raw = readFileSync(file, 'utf8');
  if (file.endsWith('.html')) {
    for (const m of raw.matchAll(/\bdata-i18n[\w-]*\s*=\s*(["'])([^"']+)\1/g)) refs.push({ key: m[2], where: rel, via: 'html' });
    continue;
  }
  const src = stripComments(raw);
  const re = /(?<![\w$.])(?:t|(?:chrome\.)?i18n\.getMessage)\(\s*(['"`])([A-Za-z0-9_@]+)\1(\s*,\s*\[)?/g;
  for (const m of src.matchAll(re)) {
    const line = src.slice(0, m.index).split('\n').length;
    const ref = { key: m[2], where: `${rel}:${line}`, via: 'js' };
    if (m[3]) ref.passed = arrayLength(src, m.index + m[0].length - 1);
    refs.push(ref);
  }
}
for (const m of JSON.stringify(manifest).matchAll(/__MSG_([A-Za-z0-9_@]+)__/g)) refs.push({ key: m[1], where: 'manifest.json', via: 'manifest' });

describe('message keys referenced by literal name', () => {
  it('finds a plausible number of references (guards against a broken extractor)', () => {
    expect(refs.length).toBeGreaterThan(150);
  });

  it('exist in the default_locale messages.json', () => {
    const missing = refs
      .filter((r) => !messages.has(r.key.toLowerCase()))
      .map((r) => `${r.key}  (${r.where})`);
    expect(missing).toEqual([]);
  });

  it('are called with at least as many substitutions as the message uses', () => {
    const short = refs
      .filter((r) => typeof r.passed === 'number' && messages.has(r.key.toLowerCase()))
      .filter((r) => r.passed < substitutionsNeeded(messages.get(r.key.toLowerCase())))
      .map((r) => `${r.key}: passes ${r.passed}, message needs ${substitutionsNeeded(messages.get(r.key.toLowerCase()))}  (${r.where})`);
    expect(short).toEqual([]);
  });
});
