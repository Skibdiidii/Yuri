<div align="center">

# ⚡ CatalystCord / Yuri Selfbot Suite ⚡

**The ultimate Discord selfbot, custom rich presence manager, soundboard executor, and VPS hosting panel.**

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://github.com/Skibdiidii/Yuri)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-cyan.svg)](https://react.dev/)
[![Discord.js Selfbot](https://img.shields.io/badge/Discord.js-Selfbot--v13-5865F2.svg)](https://github.com/aiko-chan-ai/discord.js-selfbot-v13)

---

### 💬 Note from the Developer

> **hi guys its me harumi my discord user: `@myeyesaregoingdownx`**
> 
> *this is a hard project I've done for the past 4 years and since nobody wants to use it i was thinking to just yk make it open source also i would appreciate if you just star this repository ⭐*

---

</div>

## ✨ Features

- 🎮 **Rich Presence (RPC) Manager**: Custom activities, Twitch streaming status, Spotify listening spoof, rich assets, and multi-preset switcher.
- 🔊 **Voice & Soundboard Control**: Join voice channels, stream camera/screen feed, and play high-quality audio files or YouTube streams.
- ⚡ **Nitro Sniper & Auto Claim**: Instantaneous gift code claimer operating at the gateway level.
- 🤖 **CatalystCord Execution Suite**: Integrated Lua execution endpoint (`/catalystcord.lua` & `/raw/catalystcord.lua`) compatible with Roblox executors and HTTP requests.
- 🌐 **VPS & Server Control Panel**: Auto-reconnecting background worker, persistent typing, status rotator, and account cosmetics customization.
- 🔐 **Token Extraction & Management**: Auth tools, token validator, and multi-account importer.
- 📜 **Discord API Proxy & Profile Viewer**: View full user profiles, badges, custom banners, and send direct messages via backend proxies.

---

## 🚀 Quick Start

### 📖 Setup Tutorial

1. **Invite Controller**: Click the "Invite Controller" button in the Yuri panel to add the Russian Controller Bot to your servers.
2. **Optional Server Bot**: The Server Actions bot is optional; only invite it if you wish to use server-wide commands like `/playmusic`.
3. **Command Access**: Go to any **DM, Group Chat, or Server** and type `/` to view all available commands.
   - *Note: This may not work in servers with disabled external app permissions.*
4. **Best Experience**: For the most powerful selfbot experience, use the **Automation Console** in the Yuri panel. The prefix is `.` (e.g., `.help`).

### Prerequisites
- Node.js `v18+` or `v20+`
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/Skibdiidii/Yuri.git
cd Yuri

# Install dependencies
npm install

# Build production bundle
npm run build

# Start the application
npm start
```

For development mode:
```bash
npm run dev
```

---

## 🛠️ API & Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/catalystcord.lua` | `GET` | Serves raw Lua loadstring script |
| `/api/script/execute` | `POST` | Execute custom selfbot scripts |
| `/api/rpc/update` | `POST` | Update active Rich Presence configuration |
| `/api/actions/vc/join` | `POST` | Connect selfbot to voice channel |
| `/api/auth/extract-token` | `POST` | Extracts Discord auth token |

---

## 👤 Author

- **Harumi** - Discord: `@myeyesaregoingdownx`

If you find this repository useful, please consider leaving a **Star ⭐**!
