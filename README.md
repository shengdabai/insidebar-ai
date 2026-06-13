# insidebar-ai

All your AIs—ChatGPT, Claude, Gemini, Grok, DeepSeek—in one browser sidebar. No API keys, privacy-first, open source.

## Business Context

- **Category:** AI workflow infrastructure
- **Audience:** AI builders, creators, independent developers, and small teams that want repeatable local AI workflows.
- **Repository status:** Public repository. Keep examples, docs, and issues free of credentials, private data, and machine-specific paths.
- **Topics:** ai, browser-extension, chatgpt, chrome-extension, claude, edge-extension, manifest-v3, productivity, sidebar

## What This Project Is For

- All your AIs—ChatGPT, Claude, Gemini, Grok, DeepSeek—in one browser sidebar. No API keys, privacy-first, open source.
- Package repeatable AI workflows into reusable local assets.
- Reduce one-off prompt work by keeping skills, guardrails, and handoff files versioned.

## Where It Fits

This repository is part of a broader AI local-workbench operating model: reusable skills, local automation, auditable configuration, and repeatable delivery workflows.

## Technical Overview

- **Primary language:** JavaScript
- **Detected stack:** JavaScript, Node.js / JavaScript tooling
- **Default branch:** `main`
- **Visibility:** `PUBLIC`
- **License:** MIT License

## Repository Map

- `CHANGELOG.md`
- `COPILOT_TODO.md`
- `LICENSE`
- `PRIVACY.md`
- `README.md`
- `SECURITY.md`
- `Screenshots`
- `_locales`
- `data`
- `tests`

## Quick Start

Use the commands that match the current project state:

```bash
npm install
npm run test
npm run lint
```

| Command | Purpose |
|---|---|
| `npm run test` | vitest |
| `npm run lint` | web-ext lint --source-dir . |

## Operating Notes

- Keep real credentials out of the repository. Use local environment files, GitHub repository secrets, or the deployment platform secret manager.
- If a `.env.example` file exists, treat it as documentation only; never commit filled-in `.env` files.
- Before publishing screenshots, demos, or client examples, remove private names, internal paths, account IDs, and API endpoints.
- The `Repository Hygiene` workflow is intended as a lightweight guardrail, not a replacement for product-specific tests.

## Delivery Checklist

- [ ] README describes the user, business outcome, and operating boundary.
- [ ] Setup or preview commands are current.
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
