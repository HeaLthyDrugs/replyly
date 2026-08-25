# Replyly 💬⚡

> **Intelligent, contextual AI-powered commenting & replying on X (Twitter).**

Replyly is a fast, lightweight browser extension built with [Plasmo](https://docs.plasmo.com/) and React that helps you draft thoughtful, engaging, and high-impact replies directly inside your feed.

---

## ✨ Features

- **Multi-Provider AI Support**: Connect your own API keys for **Google Gemini**, **Groq**, or **OpenRouter**.
- **Context-Aware Replies**: Generates natural, relevant comments based on the post context.
- **Customizable Tones & Personas**: Switch between casual, professional, witty, supportive, and custom prompt styles.
- **Privacy-First & Secure**: Your API keys never leave your browser; they are stored locally in secure extension storage.
- **Minimal & Clean UI**: Native-feeling buttons and clean overlay popups designed specifically for modern web interfaces.

---

## 🚀 Installation & Usage

Choose the method that works best for you:

### Method 1: Install via GitHub Releases (Recommended for End Users)

No coding or developer tools required.

1. **Download the Extension**:
   - Go to the [Releases](https://github.com/your-username/replyly/releases) page on this repository.
   - Download the latest `chrome-mv3-prod.zip` file under **Assets**.
2. **Extract the ZIP**:
   - Unzip the downloaded file into a folder on your computer (e.g. `Documents/Replyly`).
   - *Note: Keep this folder in a safe place, as Chrome loads the extension directly from it.*
3. **Load into Browser** (Chrome, Brave, Edge, Arc, Opera, Vivaldi):
   - Open your browser and navigate to:
     - **Chrome / Brave / Arc**: `chrome://extensions`
     - **Microsoft Edge**: `edge://extensions`
   - Enable **Developer mode** using the toggle in the top-right corner.
   - Click the **Load unpacked** button in the top-left corner.
   - Select the extracted folder containing `manifest.json`.
4. **Pin & Launch**:
   - Click the puzzle icon in your browser toolbar, pin **Replyly**, and click the icon to open settings.

---

### Method 2: Run & Build from Source (For Developers)

#### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) (v8 or higher) — *recommended*, or `npm` / `yarn`

#### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/replyly.git
cd replyly
pnpm install
```

#### 2. Start Development Server
```bash
pnpm dev
```
- Open `chrome://extensions` in your browser.
- Turn on **Developer mode**.
- Click **Load unpacked** and choose the generated folder: `build/chrome-mv3-dev`.
- Any code changes will hot-reload automatically in your browser.

#### 3. Create a Production Build
```bash
# Creates minified build in build/chrome-mv3-prod
pnpm build

# Creates distribution zip in build/chrome-mv3-prod.zip
pnpm package
```

---

## ⚙️ Configuration & Quick Start

1. **Open Settings**:
   - Click the **Replyly** extension icon in your browser toolbar and click **Connect Key** or the gear icon.
   - Alternatively, right-click the extension icon $\rightarrow$ **Options**.
2. **Add an API Key**:
   - Select your preferred provider (**Google Gemini**, **Groq**, or **OpenRouter**).
   - Enter your API key and save.
3. **Start Replying**:
   - Navigate to [x.com](https://x.com).
   - Find any post — you will see the Replyly action button next to reply inputs.
   - Click to generate tailored responses instantly!

---

## 📦 Automated GitHub Releases (For Maintainers)

This repository includes a GitHub Action (`.github/workflows/release.yml`) that automatically builds and publishes a release with the packaged ZIP whenever a new tag is pushed.

To publish a new release:
```bash
# 1. Update version in package.json if needed
# 2. Tag the commit
git tag v0.0.1

# 3. Push tag to GitHub
git push origin v0.0.1
```
GitHub Actions will automatically run the build, create a new GitHub Release, and attach `chrome-mv3-prod.zip`.

---

## 🔒 Privacy & Permissions

Replyly values your privacy:
- `storage`: Used solely to store your API keys and custom prompt preferences locally on your device.
- `activeTab`: Used to detect active social media tabs and seamlessly assist in generating responses.
- **No Analytics / No Telemetry**: We do not collect, track, or transmit your data to third-party tracking servers.

---

## 📄 License

MIT License. Feel free to use, modify, and distribute.
