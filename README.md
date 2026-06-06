# 🧠 insidebar.ai

> **English | [中文](#中文)**

> Every AI assistant — ChatGPT, Claude, Gemini, Grok, DeepSeek & Google AI — living in one browser sidebar, using the logins you already have.

[![Last Commit](https://img.shields.io/github/last-commit/shengdabai/insidebar-ai)](https://github.com/shengdabai/insidebar-ai/commits)
[![Stars](https://img.shields.io/github/stars/shengdabai/insidebar-ai?style=social)](https://github.com/shengdabai/insidebar-ai/stargazers)
[![Follow](https://img.shields.io/github/followers/shengdabai?style=social)](https://github.com/shengdabai)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

![insidebar.ai in action](Screenshots/1280x800_insidebar-ai-grok-opened.png)

---

## Why

You keep five AI tabs open, lose track of which one had the good answer, and re-type the same prompts into all of them. **insidebar.ai** collapses that mess into a single browser sidebar: pick an AI, chat, switch — your sessions and your logins come along for the ride. No API keys, no new accounts, no telemetry.

## What

A Manifest V3 Chrome/Edge extension that docks the real AI provider websites into Chrome's native side panel, plus a prompt library, saved chat history, and per-provider keyboard tuning. Everything runs locally in your browser.

## ✨ Features

- **🤖 6 AIs, one sidebar** — ChatGPT, Claude, Gemini, Google AI Mode, Grok, and DeepSeek, each one click away. Sessions persist when you switch tabs.
- **📚 Prompt library** — Save, tag, search, and reuse prompts. Import a starter set of 50+ curated prompts (coding, writing, analysis). Variables, categories, favorites, import/export.
- **💬 Chat history** — Save conversations from any supported provider with full Markdown + code highlighting, original links, and search.
- **📤 Send to AI** — Right-click selected text or a whole page → "Send to insidebar.ai" → pick a provider. Control whether the source URL goes first, last, or not at all.
- **⌨️ Keyboard shortcuts** — `Cmd/Ctrl+Shift+E` opens the sidebar, `Cmd/Ctrl+Shift+P` the prompt library. Configurable Enter behavior per provider (Default, Swapped, Slack-style, Discord-style, custom).
- **🌍 10 languages** — English, Chinese (Simplified & Traditional), Japanese, Korean, Spanish, French, German, Italian, Russian.
- **🎨 Theming** — Auto / Light / Dark, plus a focus mode.
- **🔒 Privacy-first** — No API keys, no analytics, zero telemetry. All data stays in your browser's local storage. Fully open source.

## 🧱 Tech stack

- **Manifest V3** Chrome extension (`sidePanel`, `declarativeNetRequest`, `contextMenus`, `storage`)
- Vanilla **JavaScript** (ES modules) — no framework runtime
- `declarativeNetRequest` to bypass `X-Frame-Options` so provider sites load in the side panel
- [Readability.js](https://github.com/mozilla/readability) for page-content extraction; [marked](https://github.com/markedjs/marked) for Markdown rendering
- **Vitest** + happy-dom for tests; **web-ext** for linting
- Chrome i18n (`_locales`) for all 10 languages

## 🚀 Install

### Chrome Web Store (recommended)

1. Open the [Chrome Web Store page](https://chromewebstore.google.com/detail/insidebarai/jhlfjcmiemebjjnbdoddhoohbdjnfece)
2. Click **Add to Chrome** → **Add Extension**
3. Click the icon or press `Cmd/Ctrl+Shift+E`

Also installs on **Microsoft Edge** straight from the Chrome Web Store.

### Load unpacked (developers)

1. Download the latest [release](https://github.com/shengdabai/insidebar-ai/releases) or **Code → Download ZIP**, then extract it
2. Go to `chrome://extensions/` (or `edge://extensions/`) and enable **Developer mode**
3. Click **Load unpacked** and select the folder containing `manifest.json`

## 📖 Usage

1. **Log in** to the AI providers you use, in normal tabs — the extension reuses those sessions.
2. **Open the sidebar** with the toolbar icon or `Cmd/Ctrl+Shift+E`.
3. **Switch providers** from the tabs at the bottom of the panel.
4. **Build a prompt library** — `Cmd/Ctrl+Shift+P`, or import 50+ defaults from Settings.
5. **Send context** — select text on any page, right-click → "Send to insidebar.ai".

> Full walkthrough — prompt variables, saving history, Enter-behavior presets, data export — lives in the extension's Settings and the [CHANGELOG](CHANGELOG.md). Privacy details: [PRIVACY.md](PRIVACY.md).

![Send to Claude](Screenshots/1280x800_insidebar-ai-send-to-claude.png)

## 🗺️ Status

- ✅ Live on the Chrome Web Store (Manifest V3, current version `1.7.2`)
- ✅ 6 providers, prompt library, chat history, 10-language UI, test suite (Vitest)
- 🔭 Actively maintained — bug reports and feature ideas welcome via [Issues](https://github.com/shengdabai/insidebar-ai/issues)

## 🤝 Connect

Built in public by **Tony (Sheng)** — a Chinese-language teacher (6,000+ students) building AI tools for learning and the browser.

If insidebar.ai saves you a few tabs, **⭐ star this repo** and **[follow @shengdabai](https://github.com/shengdabai)** to see what ships next.

More from the same workshop:

- 🗒️ [teaching-notes-sidebar](https://github.com/shengdabai/teaching-notes-sidebar)
- 🧹 [freespace](https://github.com/shengdabai/freespace)
- 🧩 [browser-extensions](https://github.com/shengdabai/browser-extensions)

Found a bug or want a feature? [Open an issue](https://github.com/shengdabai/insidebar-ai/issues). Contributions — code, docs, translations — are welcome.

## License

[MIT](LICENSE) © Tony (Sheng)

---

# 中文

> **[English](#-insidebarai) | 中文**

> 把每一个 AI 助手——ChatGPT、Claude、Gemini、Grok、DeepSeek 和 Google AI——装进同一个浏览器侧边栏，复用你已经登录的账号。

![insidebar.ai 使用效果](Screenshots/1280x800_insidebar-ai-grok-opened.png)

## 为什么

你开着五个 AI 标签页，记不清哪个给过好答案，还得把同一段提示词重复粘进每一个里。**insidebar.ai** 把这堆混乱收进一个浏览器侧边栏:选一个 AI、聊天、切换——会话和登录状态一起跟过来。无需 API 密钥、无需新账号、零遥测。

## 是什么

一个 Manifest V3 的 Chrome/Edge 扩展,把真实的 AI 提供商网站嵌入 Chrome 原生侧边栏,并附带提示词库、聊天历史保存,以及按提供商自定义的键盘行为。所有数据都在你的浏览器本地运行。

## ✨ 功能

- **🤖 一栏 6 个 AI** — ChatGPT、Claude、Gemini、Google AI 模式、Grok、DeepSeek,一键直达,切换标签会话不丢。
- **📚 提示词库** — 保存、打标签、搜索、复用;可一键导入 50+ 精选提示词(编程/写作/分析)。支持变量、分类、收藏、导入导出。
- **💬 聊天历史** — 从任意支持的提供商保存对话,完整 Markdown + 代码高亮、原始链接、可搜索。
- **📤 发送到 AI** — 右键选中文本或整页 →“发送到 insidebar.ai”→ 选提供商。可设置来源 URL 放开头、结尾或不放。
- **⌨️ 键盘快捷键** — `Cmd/Ctrl+Shift+E` 开侧边栏,`Cmd/Ctrl+Shift+P` 开提示词库。每个提供商可自定义 Enter 行为(默认 / 交换 / Slack 风格 / Discord 风格 / 自定义)。
- **🌍 10 种语言** — 英语、简繁中文、日语、韩语、西班牙语、法语、德语、意大利语、俄语。
- **🎨 主题** — 自动 / 亮色 / 暗色,并带专注模式。
- **🔒 隐私优先** — 无 API 密钥、无分析、零遥测。所有数据存于浏览器本地存储。完全开源。

## 🧱 技术栈

- **Manifest V3** Chrome 扩展(`sidePanel`、`declarativeNetRequest`、`contextMenus`、`storage`)
- 原生 **JavaScript**(ES 模块)——无框架运行时
- 用 `declarativeNetRequest` 绕过 `X-Frame-Options`,让提供商网站能在侧边栏加载
- [Readability.js](https://github.com/mozilla/readability) 提取页面正文;[marked](https://github.com/markedjs/marked) 渲染 Markdown
- **Vitest** + happy-dom 测试;**web-ext** 做 lint
- Chrome i18n(`_locales`)支撑全部 10 种语言

## 🚀 安装

### Chrome 商店(推荐)

1. 打开 [Chrome 商店页面](https://chromewebstore.google.com/detail/insidebarai/jhlfjcmiemebjjnbdoddhoohbdjnfece)
2. 点击 **添加到 Chrome** → **添加扩展程序**
3. 点击图标或按 `Cmd/Ctrl+Shift+E`

用 **Microsoft Edge** 也可直接从 Chrome 商店安装。

### 加载已解压版本(开发者)

1. 下载最新 [release](https://github.com/shengdabai/insidebar-ai/releases),或 **Code → Download ZIP** 后解压
2. 进入 `chrome://extensions/`(或 `edge://extensions/`),开启 **开发者模式**
3. 点击 **加载已解压的扩展程序**,选择包含 `manifest.json` 的文件夹

## 📖 使用

1. 在普通标签页里**登录**你要用的 AI 提供商——扩展会复用这些会话。
2. 用工具栏图标或 `Cmd/Ctrl+Shift+E` **打开侧边栏**。
3. 在侧边栏底部标签**切换提供商**。
4. **建提示词库** — `Cmd/Ctrl+Shift+P`,或在设置里导入 50+ 默认提示词。
5. **发送上下文** — 在任意网页选中文本,右键 →“发送到 insidebar.ai”。

> 完整说明(提示词变量、保存历史、Enter 行为预设、数据导出)见扩展内设置与 [CHANGELOG](CHANGELOG.md)。隐私细节见 [PRIVACY.md](PRIVACY.md)。

![发送给 Claude](Screenshots/1280x800_insidebar-ai-send-to-claude.png)

## 🗺️ 状态

- ✅ 已上架 Chrome 商店(Manifest V3,当前版本 `1.7.2`)
- ✅ 6 个提供商、提示词库、聊天历史、10 语言界面、Vitest 测试
- 🔭 持续维护中——欢迎通过 [Issues](https://github.com/shengdabai/insidebar-ai/issues) 反馈 bug 与功能想法

## 🤝 联系

由 **Tony(盛)** 在公开开发——一位中文老师(6000+ 学员),为学习与浏览器打造 AI 工具。

如果 insidebar.ai 帮你省下了几个标签页,欢迎 **⭐ Star 本仓库**,并 **[关注 @shengdabai](https://github.com/shengdabai)** 看看接下来发什么。

同一工作室的其他项目:

- 🗒️ [teaching-notes-sidebar](https://github.com/shengdabai/teaching-notes-sidebar)
- 🧹 [freespace](https://github.com/shengdabai/freespace)
- 🧩 [browser-extensions](https://github.com/shengdabai/browser-extensions)

发现 bug 或想要新功能?[提个 issue](https://github.com/shengdabai/insidebar-ai/issues)。欢迎贡献——代码、文档、翻译都行。

## 许可证

[MIT](LICENSE) © Tony(盛)
