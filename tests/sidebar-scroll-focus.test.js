// Scrollable regions must be reachable by keyboard (axe `scrollable-region-focusable`):
// Safari does not make overflow containers focusable on its own. #prompt-list scrolls,
// so it needs tabindex="0" and an accessible name.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('sidebar prompt list', () => {
  it('is keyboard-focusable and named', () => {
    const doc = new DOMParser().parseFromString(readFileSync(path.join(root, 'sidebar/sidebar.html'), 'utf8'), 'text/html');
    const list = doc.getElementById('prompt-list');
    expect(list).not.toBeNull();
    expect(list.getAttribute('tabindex')).toBe('0');
    const by = (list.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
    const named = (list.getAttribute('aria-label') || '').trim()
      || by.some((id) => (doc.getElementById(id)?.textContent || '').trim());
    expect(named, 'aria-label or aria-labelledby pointing at visible text').toBeTruthy();
  });
});
