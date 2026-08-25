# Replyly

Intelligent, contextual AI-powered commenting and replying on social feeds.

[![CI](https://github.com/HeaLthyDrugs/replyly/actions/workflows/ci.yml/badge.svg)](https://github.com/HeaLthyDrugs/replyly/actions/workflows/ci.yml)
[![Release](https://github.com/HeaLthyDrugs/replyly/actions/workflows/release.yml/badge.svg)](https://github.com/HeaLthyDrugs/replyly/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Chrome%20Extension%20MV3-orange.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![Framework](https://img.shields.io/badge/Built%20With-Plasmo%20%2B%20React-purple.svg)](https://docs.plasmo.com/)
[![Docker](https://img.shields.io/badge/Docker-Supported-2496ED.svg)](docker-compose.yml)

Replyly is a high-performance browser extension built with Plasmo and React. It integrates directly into social platform feeds (such as X/Twitter) to extract post context, formulate custom persona-aligned prompts, and invoke state-of-the-art AI models to draft thoughtful, relevant responses in one click.

---

## How It Works

Replyly follows a clean, client-side lifecycle that preserves privacy while delivering contextual responses directly into your browser workflow.

![Replyly Architecture and Data Flow](assets/architecture-diagram.jpg)

### Lifecycle Overview

1. **Context Extraction**: When viewing a post on supported platforms, Replyly detects the active conversation thread and extracts the post text and context.
2. **DOM Injection**: A lightweight, native-styled Replyly action button is injected alongside standard interface controls.
3. **Tone & Persona Selection**: Choose from predefined tones (Professional, Casual, Witty, Supportive) or apply custom persona instructions.
4. **Direct API Dispatch**: The prompt and post context are dispatched directly to your configured AI provider (Google Gemini, Groq, or OpenRouter) using your locally stored API key.
5. **Auto-Fill Response**: The generated response is inserted directly into the reply textarea, ready for your review, editing, and submission.

---

## User Journey

The workflow is designed to be frictionless, requiring minimal setup and no complex background services.

![Replyly User Quickstart Workflow](assets/workflow-diagram.jpg)

1. **Connect API Key**: Open the extension options and enter your preferred provider API key.
2. **Browse Feed**: Navigate to your feed where Replyly automatically attaches to reply boxes.
3. **Select Tone**: Click the Replyly icon and pick your desired tone.
4. **Instant Reply**: Review the tailored response and post.

---

## Key Features

- **Multi-Provider AI Architecture**: Connect your own API keys for Google Gemini, Groq (Llama models), or OpenRouter (Claude, Mistral, GPT, DeepSeek).
- **Context-Aware Generation**: Analyzes parent posts and conversation context for accurate and coherent output.
- **Customizable Personas**: Tailor tone, style, length, and behavioral instructions to match your personal or brand voice.
- **Zero-Telemetry & Privacy-First**: API keys and configurations are stored solely in local browser storage (`chrome.storage.local`). No intermediate servers or data collection.
- **Containerized Build Environment**: Complete Docker and Docker Compose support for reproducible local development and packaging.
- **Automated CI/CD**: Automated GitHub Actions workflows for continuous integration testing and automated release artifact distribution.

---

## Installation

### Option 1: Install from GitHub Releases (Recommended for Users)

1. Navigate to the [Releases](https://github.com/HeaLthyDrugs/replyly/releases) page on this repository.
2. Download the latest `chrome-mv3-prod.zip` package under **Assets**.
3. Extract the downloaded ZIP file to a permanent directory on your local machine.
4. Open your browser extension manager:
   - **Google Chrome / Brave / Arc**: `chrome://extensions`
   - **Microsoft Edge**: `edge://extensions`
5. Enable **Developer mode** using the toggle in the upper-right corner.
6. Click **Load unpacked** and select the extracted folder containing `manifest.json`.
7. Pin the Replyly extension icon to your browser toolbar and configure your API key.

---

### Option 2: Build from Source (For Developers)

#### Prerequisites
- Node.js (v20 or v22 LTS recommended)
- pnpm (v10 recommended, or v9)

#### 1. Clone the Repository
```bash
git clone https://github.com/HeaLthyDrugs/replyly.git
cd replyly
```

#### 2. Install Dependencies
```bash
pnpm install
```

#### 3. Run Development Server
```bash
pnpm dev
```
- Open `chrome://extensions` in your browser.
- Enable **Developer mode**.
- Click **Load unpacked** and select the directory: `build/chrome-mv3-dev`.
- Code modifications will hot-reload automatically.

#### 4. Build Production Bundle
```bash
# Compile minified production bundle to build/chrome-mv3-prod
pnpm build

# Generate distribution zip archive in build/chrome-mv3-prod.zip
pnpm package
```

---

## Docker Setup

Replyly includes a multi-stage Docker environment for development and automated builds without requiring local Node.js or pnpm installations.

### 1. Build Extension with Docker
To compile and package the extension into the local `build/` directory:

```bash
docker compose run --rm build
```

The output bundle (`chrome-mv3-prod.zip` and the unpacked folder) will be available in the `build/` directory on your host machine.

### 2. Run Live Development with Docker
To start the live reloading development server inside a container:

```bash
docker compose up dev
```

Load the unpacked extension from `build/chrome-mv3-dev` into your browser.

---

## AI Provider Configuration

Replyly connects directly to third-party model providers. You can obtain API keys from the following official portals:

| Provider | Supported Models | Key Acquisition |
| :--- | :--- | :--- |
| **Google Gemini** | Gemini 2.0 Flash, Gemini 1.5 Flash / Pro | [Google AI Studio](https://aistudio.google.com/) |
| **Groq** | Llama 3.3 70B, Llama 3 8B, Mixtral | [Groq Console](https://console.groq.com/) |
| **OpenRouter** | Claude 3.5 Sonnet, GPT-4o, DeepSeek R1/V3 | [OpenRouter Portal](https://openrouter.ai/) |

### Configuring in Replyly
1. Click the Replyly extension icon in your browser toolbar or right-click and select **Options**.
2. Select your desired AI provider.
3. Paste your API key into the secure input field and select **Save Settings**.
4. Test the connection using the built-in validation action.

---

## Release Management & Automation

This repository uses automated GitHub Actions to build, package, and publish releases whenever a version tag is pushed.

### Creating a New Release

1. Update the version number in `package.json` if necessary:
   ```json
   "version": "0.0.2"
   ```
2. Commit your changes:
   ```bash
   git commit -am "chore: prepare release v0.0.2"
   ```
3. Create and push a git tag:
   ```bash
   git tag v0.0.2
   git push origin v0.0.2
   ```
4. The `.github/workflows/release.yml` workflow will automatically:
   - Check out code and configure pnpm v10 and Node.js v22.
   - Install dependencies with `--frozen-lockfile`.
   - Build and package `build/chrome-mv3-prod.zip`.
   - Create a published GitHub Release with release notes and attached ZIP asset.

---

## Project Structure

```
replyly/
├── .github/
│   └── workflows/
│       ├── ci.yml              # Continuous integration build validation
│       ├── release.yml         # Automated tag-driven release publisher
│       └── submit.yml          # Web store publication pipeline
├── assets/
│   ├── architecture-diagram.jpg # Hand-drawn architecture diagram
│   ├── workflow-diagram.jpg     # Hand-drawn quickstart user guide
│   ├── icon.png                 # Main extension icon
│   └── favicon/                 # Browser favicon assets
├── components/                  # Shared React UI components
├── contents/
│   └── x-posts.tsx              # DOM injection script for social feeds
├── lib/
│   ├── ai/                      # AI provider client adapters
│   ├── grok-dom.ts              # Feed parser utilities
│   ├── guidesData.tsx           # Inline onboarding documentation
│   └── x-dom.ts                 # DOM interaction helpers
├── options.tsx                  # Full extension settings & options page
├── popup.tsx                    # Extension toolbar popup interface
├── Dockerfile                   # Multi-stage container definition
├── docker-compose.yml           # Container orchestration for dev & build
├── package.json                 # Project dependencies and manifest config
└── tsconfig.json                # TypeScript compiler configuration
```

---

## Security & Permissions

Replyly requests only the minimum permissions required for operation:

- `storage`: Stores encrypted provider preferences and API keys locally in the browser (`chrome.storage.local`).
- `activeTab`: Permits interaction with the active page DOM to extract post content and inject drafted replies.
- `web_accessible_resources`: Permits loading local extension assets (logos, icons) within injected feed containers.

No user credentials, browsing history, or generated text are tracked, stored on external servers, or sold.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
