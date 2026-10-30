# insidebar-ai

All your AIs—ChatGPT, Claude, Gemini, Grok, DeepSeek—in one browser sidebar. No API keys, privacy-first, open source.

![Version](https://img.shields.io/badge/version-1.7.2-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Languages](https://img.shields.io/badge/languages-10-brightgreen.svg)
![Test](https://github.com/shengdabai/insidebar-ai/actions/workflows/test.yml/badge.svg)

## Business Context

- **Category:** browser productivity extension
- **Audience:** people who use AI websites while reading or working in Chrome or Edge.
- **Repository status:** Public repository. Keep examples, docs, and issues free of credentials, private data, and machine-specific paths.
- **Topics:** ai, browser-extension, chatgpt, chrome-extension, claude, edge-extension, manifest-v3, productivity, sidebar

## What This Project Is For

- All your AIs—ChatGPT, Claude, Gemini, Grok, DeepSeek—in one browser sidebar. No API keys, privacy-first, open source.
- Save and reuse prompts from a local prompt library.
- Save conversations locally and search them by text, tags, or provider.

## Where It Fits

The extension puts AI provider websites beside the current page. It uses the providers' web interfaces, with local prompt and conversation storage rather than API keys.

## Technical Overview

- **Primary language:** JavaScript
- **Detected stack:** JavaScript, Node.js
- **Default branch:** `main`
- **Visibility:** `PUBLIC`
- **License:** MIT License

## Repository Map

- `data`
- `tests`
- `tools` (development scripts; not packaged)
- `CHANGELOG.md`
- `LICENSE`
- `PRIVACY.md`
- `README.md`
- `SECURITY.md`
- `Screenshots`
- `_locales`
- `background`
- `content-scripts`

## Quick Start

Use the checked-in lockfile to install the development tools:

```bash
npm ci
npm run lint
npm test -- --run
npm run build
```

| Command | Purpose |
|---|---|
| `npm ci` | Install the dependency versions in `package-lock.json`. |
| `npm run lint` | web-ext lint --source-dir . |
| `npm test -- --run` | Run all Vitest tests once and exit. |
| `npm run test:watch` | Run Vitest in watch mode during development. |
| `npm run build` | web-ext build: packages the extension into `web-ext-artifacts/`, leaving out `tools`, `tests`, `Screenshots` and npm files (`webExt.ignoreFiles` in package.json). Use this instead of zipping the folder by hand. |

`web-ext lint` checks Firefox compatibility as well, and CI runs it. The manifest declares a Gecko add-on ID (`browser_specific_settings.gecko`, Firefox 128 or later) and lists the background script under both `service_worker` (used by Chrome/Edge) and `scripts` (used by Firefox), so lint reports no errors; its remaining warnings are not blocking. The sidebar itself uses Chrome's `chrome.sidePanel` API, which Firefox does not provide, so the background script skips it there and the sidebar does not open in Firefox yet. Full Firefox support remains a roadmap item; neither lint nor a successful build establishes it.

To try the extension locally, open `chrome://extensions` (or `edge://extensions`), enable Developer mode, choose **Load unpacked**, and select this repository folder. Open InsideBar AI from the browser toolbar. Sign in to a provider yourself if its website requires it.

Before release, manually check opening the sidebar, switching providers, inserting a saved prompt, saving a conversation, and searching saved history. The unit suite uses browser API mocks; it does not prove that current provider websites can load or accept input in the extension.

## Local Data Behavior

- Settings imports use `skip`: prompt titles are compared without case or surrounding whitespace. Conversations use the existing same-title, timestamp-within-one-minute duplicate rule.
- Imported record IDs and the internal conversation `overwriteId` control cannot select a local record to replace. The programmatic `overwrite` import strategy currently appends records; it does not replace matching records or clear a library.
- Provider search accepts multiple provider values, partial names, case differences and spelling tolerance. Search scans saved conversations before applying these filters.
- Saved conversation Markdown keeps ordinary formatting, tables, code and disabled task checkboxes. Active embeds, forms, scripts, styles and unsafe URL protocols are removed when displayed. Original-conversation links accept HTTP(S) only. External Markdown images can still load remote resources when displayed.

## Operating Notes

- Keep real credentials out of the repository. Use local environment files, GitHub repository secrets, or the deployment platform secret manager.
- If a `.env.example` file exists, treat it as documentation only; never commit filled-in `.env` files.
- Before publishing screenshots, demos, or client examples, remove private names, internal paths, account IDs, and API endpoints.
- The `Repository Hygiene` workflow is a lightweight guardrail, not a replacement for product-specific tests.

## Delivery Checklist

- [ ] README describes the user, business outcome, and operating boundary.
- [ ] Setup or preview commands are current and do not rely on private machine state.
- [ ] No real secrets, private user data, or machine-local state are tracked.
- [ ] Screenshots, demos, or sample outputs are safe to share publicly when the repository is public.
- [ ] Product-specific tests or smoke checks are documented before production use.

## Roadmap

- Tighten the fastest path from clone to useful demo.
- Add project-specific screenshots, sample outputs, or a short walkthrough where useful.
- Promote repeated manual steps into scripts, tests, or documented workflows.
- Keep security, privacy, and licensing boundaries explicit as the project evolves.

## Maintainer Notes

Maintained by [Tony Sheng](https://github.com/shengdabai). This README is written as a business-facing handoff: it should help a future collaborator, client, or reviewer understand why the repository exists, how to inspect it, and what must be true before it is reused or shipped.
