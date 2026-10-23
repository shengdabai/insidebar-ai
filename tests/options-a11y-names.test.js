// Every form control on the options page needs an accessible name
// (axe rules `select-name` / `label`). The name may come from aria-label,
// aria-labelledby (pointing at visible text), a <label for>, or a wrapping <label>.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = 'select, textarea, input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="file"])';

function labelText(label) {
  const clone = label.cloneNode(true);
  for (const c of clone.querySelectorAll('select, textarea, input')) c.remove();
  return (clone.textContent || '').trim();
}

function hasAccessibleName(doc, el) {
  if ((el.getAttribute('aria-label') || '').trim()) return true;
  // axe (label rule) also accepts a non-empty placeholder.
  if ((el.getAttribute('placeholder') || '').trim() || (el.getAttribute('data-i18n-placeholder') || '').trim()) return true;
  const by = el.getAttribute('aria-labelledby');
  if (by && by.split(/\s+/).some((id) => (doc.getElementById(id)?.textContent || '').trim())) return true;
  if (el.id && [...doc.querySelectorAll('label')].some((l) => l.getAttribute('for') === el.id && labelText(l))) return true;
  const wrap = el.closest('label');
  return !!(wrap && labelText(wrap));
}

describe('options page form controls have accessible names', () => {
  it('no select/checkbox/textarea is left without a name', () => {
    const doc = new DOMParser().parseFromString(readFileSync(path.join(root, 'options/options.html'), 'utf8'), 'text/html');
    const unnamed = [...doc.querySelectorAll(CONTROL)].filter((el) => !hasAccessibleName(doc, el)).map((el) => `${el.tagName.toLowerCase()}#${el.id}`);
    expect(unnamed).toEqual([]);
  });

  it('aria-labelledby targets exist and are unique', () => {
    const doc = new DOMParser().parseFromString(readFileSync(path.join(root, 'options/options.html'), 'utf8'), 'text/html');
    const ids = [...doc.querySelectorAll('[id]')].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const el of doc.querySelectorAll('[aria-labelledby]')) {
      for (const id of el.getAttribute('aria-labelledby').split(/\s+/)) expect(doc.getElementById(id), id).not.toBeNull();
    }
  });
});

describe('sidebar provider iframes have a title (axe frame-title)', () => {
  // sidebar.js runs on DOMContentLoaded and cannot be imported as a module,
  // so this guards the source line that names every provider frame.
  it('createProviderIframe sets iframe.title from the provider name', () => {
    const src = readFileSync(path.join(root, 'sidebar/sidebar.js'), 'utf8');
    const fn = src.slice(src.indexOf('function createProviderIframe'), src.indexOf('container.appendChild(iframe)'));
    expect(fn).toMatch(/iframe\.title\s*=\s*provider\.name/);
  });
});
