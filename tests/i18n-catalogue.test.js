// Message catalogue hygiene: no dead keys, every locale has the same keys, and calls that pass
// substitutions use a message that has a slot for each one (extra values are silently dropped).
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', '_locales', 'libs', 'tests', '.git', '.git.nosync', 'Screenshots']);

function sourceFiles(dir = root, out = []) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) {
      if (!SKIP_DIRS.has(name) && !name.startsWith('.')) sourceFiles(p, out);
    } else if (/\.(js|html|json)$/.test(name) && !/^(package(-lock)?\.json|marked\.min\.js)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

const read = (rel) => JSON.parse(readFileSync(path.join(root, rel), 'utf8'));
const en = read('_locales/en/messages.json');
const sources = sourceFiles().map((p) => readFileSync(p, 'utf8')).join('\n');

describe('i18n message keys', () => {
  it('every key in _locales/en is referenced by the extension', () => {
    // Keys are only ever used as whole literals (t('key'), data-i18n="key", __MSG_key__); none are built at runtime.
    const unused = Object.keys(en).filter((k) => !new RegExp(`(^|[^A-Za-z0-9_])${k}([^A-Za-z0-9_]|$)|__MSG_${k}__`).test(sources));
    expect(unused).toEqual([]);
  });

  it('every locale has exactly the keys of _locales/en', () => {
    const enKeys = Object.keys(en).sort();
    for (const loc of readdirSync(path.join(root, '_locales'))) {
      expect(Object.keys(read(`_locales/${loc}/messages.json`)).sort(), loc).toEqual(enKeys);
    }
  });

  it('t(key, [..]) never passes more values than the message has slots', () => {
    const tooMany = [];
    for (const m of sources.matchAll(/\bt\(\s*'([A-Za-z0-9_]+)'\s*,\s*\[([^\]]*)\]/g)) {
      const [, key, args] = m;
      const n = args.split(',').filter((a) => a.trim()).length;
      const msg = en[key];
      const slots = msg ? Math.max(Object.keys(msg.placeholders || {}).length, (msg.message.match(/\$\d/g) || []).length) : 0;
      if (!msg || n > slots) tooMany.push(`${key}: ${n} values, ${slots} slots`);
    }
    expect(tooMany).toEqual([]);
  });
});
