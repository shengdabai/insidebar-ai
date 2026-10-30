import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('translation substitutions', () => {
  let i18n;
  beforeEach(async () => {
    vi.resetModules();
    vi.stubGlobal('chrome', { runtime: { getURL: p => p }, i18n: { getMessage: vi.fn() } });
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({
      literal: { message: '$1 / $2' },
      named: { message: '$VALUE$', placeholders: { value: { content: '$1' } } },
      markup: { message: '<strong>$1</strong>' },
    }) })));
    i18n = await import('../modules/i18n.js');
    await i18n.initializeLanguage('en');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('preserves dollar replacement syntax and does not reinterpret inserted placeholders', () => {
    expect(i18n.t('literal', ['$2 $&', 'second'])).toBe('$2 $& / second');
    expect(i18n.t('named', "$& $` $'")).toBe("$& $` $'");
  });

  it('escapes external substitutions used inside trusted translated HTML', () => {
    const html = i18n.t('markup', '<img src="data:,test" onerror="unsafe()">', { escapeSubstitutions: true });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelector('img')).toBeNull();
    expect(doc.querySelector('strong').textContent).toBe('<img src="data:,test" onerror="unsafe()">');
  });

  it('keeps ordinary text substitutions unchanged', () => {
    expect(i18n.t('literal', ['<literal>', 'A & B'])).toBe('<literal> / A & B');
  });

  it('escapes substitutions in the native Chrome translation fallback', () => {
    chrome.i18n.getMessage.mockImplementation((key, subs) => `<strong>${subs[0]}</strong>`);
    expect(i18n.t('native', ['<unsafe>'], { escapeSubstitutions: true })).toBe('<strong>&lt;unsafe&gt;</strong>');
  });
});
