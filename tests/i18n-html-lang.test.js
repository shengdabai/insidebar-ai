// <html lang> must follow the locale whose strings are actually rendered into the page.
// insidebar.ai has its own language setting (storage.sync "language"), so the attribute
// has to come from the loaded translations, not from chrome.i18n.getUILanguage().
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeLanguage, translatePage } from '../modules/i18n.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const locales = readdirSync(path.join(root, '_locales'));
const bcp47 = (dir) => dir.replace('_', '-');
const readMessages = (dir) => JSON.parse(readFileSync(path.join(root, '_locales', dir, 'messages.json'), 'utf8'));

describe('html_lang in every locale', () => {
  it('lists the ten shipped locales', () => {
    expect(locales.sort()).toEqual(['de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'ru', 'zh_CN', 'zh_TW']);
  });

  it.each(locales)('%s declares html_lang as its BCP 47 tag', (dir) => {
    expect(readMessages(dir).html_lang?.message).toBe(bcp47(dir));
  });

  it('the extension pages default to the default_locale before i18n runs', () => {
    const manifest = JSON.parse(readFileSync(path.join(root, 'manifest.json'), 'utf8'));
    expect(manifest.default_locale).toBe('en');
    for (const page of ['sidebar/sidebar.html', 'options/options.html']) {
      const html = readFileSync(path.join(root, page), 'utf8');
      expect(html, page).toMatch(/<html[^>]*\slang="en"/);
    }
  });
});

describe('translatePage sets <html lang> from the loaded translations', () => {
  const saved = {};
  beforeEach(() => {
    saved.fetch = global.fetch;
    saved.getURL = chrome.runtime.getURL;
    saved.i18n = chrome.i18n;
    chrome.runtime.getURL = (p) => p;
    chrome.i18n = { getUILanguage: () => 'en-US', getMessage: vi.fn(() => '') };
    global.fetch = vi.fn(async (url) => ({ json: async () => JSON.parse(readFileSync(path.join(root, url), 'utf8')) }));
    document.documentElement.setAttribute('lang', 'x-unset');
  });
  afterEach(() => {
    global.fetch = saved.fetch;
    chrome.runtime.getURL = saved.getURL;
    chrome.i18n = saved.i18n;
  });

  it.each(locales)('user-selected language %s -> lang matches', async (dir) => {
    await initializeLanguage(dir);
    translatePage(document);
    expect(document.documentElement.getAttribute('lang')).toBe(bcp47(dir));
  });

  it('switching language at runtime updates lang again', async () => {
    await initializeLanguage('ja');
    translatePage();
    expect(document.documentElement.getAttribute('lang')).toBe('ja');
    await initializeLanguage('zh_TW');
    translatePage();
    expect(document.documentElement.getAttribute('lang')).toBe('zh-TW');
  });

  it('falls back to the Chrome-resolved html_lang when the translation files cannot be loaded', async () => {
    global.fetch = vi.fn(async () => { throw new Error('offline'); });
    chrome.i18n.getMessage = vi.fn((key) => (key === 'html_lang' ? 'ko' : ''));
    await initializeLanguage('de');
    translatePage();
    expect(document.documentElement.getAttribute('lang')).toBe('ko');
  });

  it('leaves lang untouched (never writes the raw key) when no html_lang is available at all', async () => {
    global.fetch = vi.fn(async () => { throw new Error('offline'); });
    await initializeLanguage('de');
    translatePage();
    expect(document.documentElement.getAttribute('lang')).toBe('x-unset');
  });
});
