import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Firefox (Gecko) compatibility for the MV3 build (#18, #21).
 *
 * - Firefox requires an add-on ID in MV3 and runs `background.scripts`
 *   (an event page) instead of `background.service_worker`.
 * - Chrome 121+ ignores `background.scripts` in MV3 and keeps using the
 *   service worker, so both keys point at the same file.
 * - Firefox has no `chrome.sidePanel`; the background script must not
 *   throw when that namespace is missing.
 */

// happy-dom replaces the global URL, so resolve the path with node:path.
const manifestPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

describe('manifest: Firefox compatibility', () => {
  it('declares a stable Gecko add-on ID', () => {
    const gecko = manifest.browser_specific_settings?.gecko;
    expect(gecko).toBeDefined();
    expect(gecko.id).toBe('insidebar-ai@shengdabai.github.io');
  });

  it('sets strict_min_version to an MV3-capable Firefox (>= 128)', () => {
    const version = manifest.browser_specific_settings.gecko.strict_min_version;
    expect(version).toMatch(/^\d+(\.\d+)*$/);
    expect(Number.parseInt(version, 10)).toBeGreaterThanOrEqual(128);
  });

  it('keeps service_worker for Chrome and lists the same file in scripts for Firefox', () => {
    const { background } = manifest;
    expect(background.service_worker).toBe('background/service-worker.js');
    expect(background.scripts).toEqual([background.service_worker]);
    expect(background.type).toBe('module');
  });
});

function createListenerSlot() {
  const listeners = [];
  return {
    listeners,
    addListener: vi.fn((fn) => listeners.push(fn)),
  };
}

// A chrome.* surface shaped like Firefox MV3: everything the background
// script registers at startup exists, but there is no sidePanel namespace.
function createFirefoxLikeChrome() {
  return {
    runtime: {
      onInstalled: createListenerSlot(),
      onStartup: createListenerSlot(),
      onMessage: createListenerSlot(),
      sendMessage: vi.fn((message, callback) => {
        if (callback) callback({ success: true });
      }),
      getURL: vi.fn((path) => `moz-extension://test/${path}`),
      lastError: null,
    },
    i18n: {
      getUILanguage: vi.fn(() => 'en'),
      getMessage: vi.fn(() => ''),
    },
    storage: {
      sync: { get: vi.fn((defaults) => Promise.resolve(defaults)) },
      onChanged: createListenerSlot(),
    },
    contextMenus: {
      create: vi.fn(),
      removeAll: vi.fn(() => Promise.resolve()),
      onClicked: createListenerSlot(),
    },
    action: { onClicked: createListenerSlot() },
    commands: { onCommand: createListenerSlot() },
    windows: { onRemoved: createListenerSlot() },
    tabs: { sendMessage: vi.fn(() => Promise.resolve({ success: false })) },
  };
}

describe('background script without chrome.sidePanel (Firefox)', () => {
  let originalChrome;
  let originalFetch;

  beforeEach(() => {
    originalChrome = global.chrome;
    originalFetch = global.fetch;
    global.chrome = createFirefoxLikeChrome();
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
    vi.resetModules();
  });

  afterEach(() => {
    global.chrome = originalChrome;
    global.fetch = originalFetch;
  });

  it('loads and registers its listeners without touching sidePanel', async () => {
    await expect(import('../background/service-worker.js')).resolves.toBeDefined();

    expect(chrome.runtime.onInstalled.listeners).toHaveLength(1);
    expect(chrome.runtime.onStartup.listeners).toHaveLength(1);
    expect(chrome.action.onClicked.listeners).toHaveLength(1);
    expect(chrome.commands.onCommand.listeners).toHaveLength(1);
  });

  it('runs the install and startup handlers without throwing', async () => {
    await import('../background/service-worker.js');

    await expect(chrome.runtime.onInstalled.listeners[0]()).resolves.toBeUndefined();
    await expect(chrome.runtime.onStartup.listeners[0]()).resolves.toBeUndefined();
    expect(chrome.contextMenus.create).toHaveBeenCalled();
  });

  it('handles toolbar, keyboard and context-menu triggers without throwing', async () => {
    await import('../background/service-worker.js');
    const tab = { id: 7, windowId: 3 };

    await expect(chrome.action.onClicked.listeners[0](tab)).resolves.toBeUndefined();
    await expect(chrome.commands.onCommand.listeners[0]('open-prompt-library', tab)).resolves.toBeUndefined();
    await expect(chrome.commands.onCommand.listeners[0]('toggle-focus', tab)).resolves.toBeUndefined();
    await expect(
      chrome.contextMenus.onClicked.listeners[0]({ menuItemId: 'provider-claude', pageUrl: 'https://example.com' }, tab)
    ).resolves.toBeUndefined();
  });

  it('still uses chrome.sidePanel when it exists (Chrome)', async () => {
    chrome.sidePanel = {
      open: vi.fn(() => Promise.resolve()),
      setPanelBehavior: vi.fn(() => Promise.resolve()),
    };
    await import('../background/service-worker.js');

    await chrome.runtime.onStartup.listeners[0]();
    expect(chrome.sidePanel.setPanelBehavior).toHaveBeenCalledWith({ openPanelOnActionClick: false });

    await chrome.action.onClicked.listeners[0]({ id: 1, windowId: 9 });
    expect(chrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 9 });
  });
});
