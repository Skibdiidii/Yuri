# 🌸 Harumi — Public Multi-Feature Discord Community Bot

Harumi is a production-grade, all-in-one public Discord community bot combining **Harumi AI**, a **Dynamic Voice TTS Welcome System**, **Moderation with Case Tracking**, **AutoMod**, **Tickets**, **Verification**, **Leveling**, **Economy**, **Giveaways**, **Polls**, and over **100 Real-Time Commands**.

Every Discord server invited has **100% independent configuration** and data isolation. Harumi does **not** rely on hardcoded developer IDs or private guild assumptions—it uses Discord's native permissions (`Administrator`, `ManageGuild`, `ModerateMembers`).

---

## 🚀 Key Features

- **Harumi AI Assistant**: Intelligent, rate-limited, contextual chat (`.ai`, `.ask`, `.aistats`, `.aireset`, `.aiconfig`).
- **Dynamic Voice & Text Welcome**:
  - Automatically speaks in your voice channel when members join.
  - Dynamically retrieves the guild owner's current display name (`guild.ownerId`).
  - Default template: `Hello {display}. Welcome to the server. Make sure you add {owner}.`
  - Sequential non-overlapping audio queue with automatic reconnect.
  - Interactive setup (`.setupwelc`) and instant testing (`.testwelc`).
- **100+ Real-Time Commands**: Live weather, currency exchange, cryptocurrency, stocks, breaking news, gaming server stats (Minecraft, Roblox, Steam), internet/service latency, and Discord server live metrics.
- **Enterprise Moderation**: Case IDs, `.warn`, `.warnings`, `.kick`, `.ban`, `.unban`, `.timeout`, `.purge`, `.lock`, `.unlock`.
- **Advanced AutoMod**: Anti-spam, anti-flood, anti-mention spam, anti-invite, anti-link, anti-caps, bad-word filtering, duplicate message detection, raid protection, and account-age limits.
- **Community Tools**: Interactive button tickets (`.ticket panel`), verification gates (`.verification setup`), level progression (`.rank`, `.leaderboard`), server economy (`.balance`, `.daily`, `.work`, `.shop`, `.buy`), interactive polls, and giveaways.
- **Web Command Center & Health Endpoint**: Real-time status, Discord chat simulator, voice playback tester, command catalog explorer, and `GET /health`.

---

## 📋 Table of Contents

1. [Discord Application Creation](#1-discord-application-creation)
2. [Bot Creation & Token](#2-bot-creation--token)
3. [Required Gateway Intents](#3-required-gateway-intents)
4. [Required Discord Permissions](#4-required-discord-permissions)
5. [Installation & Setup](#5-installation--setup)
6. [Database Initialization (Prisma ORM)](#6-database-initialization-prisma-orm)
7. [Starting Harumi](#7-starting-harumi)
8. [Inviting Harumi to Your Server](#8-inviting-harumi-to-your-server)
9. [Voice Welcome Setup (`.setupwelc`)](#9-voice-welcome-setup-setupwelc)
10. [Voice Welcome Testing (`.testwelc`)](#10-voice-welcome-testing-testwelc)
11. [Harumi AI Commands](#11-harumi-ai-commands)
12. [100 Real-Time Commands](#12-100-real-time-commands)
13. [Configuration Reference](#13-configuration-reference)
14. [Troubleshooting & Diagnostics](#14-troubleshooting--diagnostics)
15. [Docker Deployment](#15-docker-deployment)
16. [Production VPS Deployment](#16-production-vps-deployment)

---

### 1. Discord Application Creation

1. Navigate to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** in the top right.
3. Enter the application name: **Harumi** and accept the Developer Terms.

---

### 2. Bot Creation & Token

1. In your application dashboard, click **Bot** in the left sidebar.
2. Click **Add Bot** and confirm.
3. Under the **Token** section, click **Reset Token** and copy the resulting string.
4. Save this token as `DISCORD_TOKEN` in your `.env` file.

---

### 3. Required Gateway Intents

On the **Bot** page, scroll down to **Privileged Gateway Intents** and enable:

- ✅ **PRESENCE INTENT** (for `.presence` and live member activity)
- ✅ **SERVER MEMBERS INTENT** (for voice/text welcome triggers, join events, leveling)
- ✅ **MESSAGE CONTENT INTENT** (for prefix commands `.`, AutoMod filtering)

Click **Save Changes**.

---

### 4. Required Discord Permissions

Harumi requires the following bot permissions:

- `Administrator` (Recommended for full moderation, channel management, and voice connectivity)
- Alternatively, granular permissions:
  - Manage Channels, Manage Roles, Kick Members, Ban Members, Moderate Members
  - Send Messages, Embed Links, Attach Files, Read Message History, Add Reactions, Use External Emojis
  - Connect, Speak, Move Members, Mute Members

Permission Integer: `8` (Administrator) or `1099511627775`.

---

### 5. Installation & Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/your-repo/harumi.git
cd harumi
npm install --legacy-peer-deps
```

Create your `.env` configuration:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DISCORD_TOKEN="YOUR_DISCORD_BOT_TOKEN"
DISCORD_CLIENT_ID="YOUR_DISCORD_CLIENT_ID"
DATABASE_URL="file:./dev.db"
PORT=3000
AI_API_ENDPOINT="https://api.mistral.ai/v1"
AI_MODEL="open-mistral-7b"
AI_KEY="B4uCaEJo9ZCuZo5Am6BpAwt30lP86WMu"
```

---

### 6. Database Initialization (Prisma ORM)

Generate Prisma client and create SQLite database schemas:

```bash
npm run db:generate
npm run db:push
```

To run test validations:

```bash
npm test
```

---

### 7. Starting Harumi

Start the unified Discord bot and Web Command Center:

```bash
# Development mode with live reload & Vite middleware
npm run dev

# Or production build & start
npm run build
npm start
```

Visit `http://localhost:3000` to access the interactive web dashboard and simulator.

---

### 8. Inviting Harumi to Your Server

Generate your invite URL using your Client ID:

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

Authorize Harumi into any server where you hold `Manage Server` or `Administrator` permissions.

---

### 9. Voice Welcome Setup (`.setupwelc`)

Run in any server text channel:

```
.setupwelc
```

This presents the interactive setup interface allowing you to configure:
- Target voice channel
- Welcome text channel
- TTS enabled/disabled
- Custom template
- Volume and bot filtering

Default template:
```
Hello {display}. Welcome to the server. Make sure you add {owner}.
```

Supported dynamic variables:
- `{display}` — Member's server display name
- `{owner}` — Dynamically resolved server owner display name
- `{server}` — Server name
- `{memberCount}` — Total members
- `{user}` — Username
- `{mention}` — Member mention tag

---

### 10. Voice Welcome Testing (`.testwelc`)

Immediately verify voice announcements without leaving the server:

```
.testwelc
```

Harumi will synthesize speech using your administrator display name and dynamically insert the server owner's name.

Example:
- Executing admin: `John`
- Server owner: `Alex`
- Harumi speaks: **"Hello John. Welcome to the server. Make sure you add Alex."**

If the server owner updates their Discord display name, subsequent announcements automatically use the new name without requiring bot reconfiguration.

---

### 11. Harumi AI Commands

- `.ai <prompt>` / `.ask <prompt>` — Query Harumi AI
- `.aireset` — Clears conversation history for the channel
- `.aiconfig` — Displays active AI endpoint & model parameters
- `.aistats` — Displays requests today, latency, and operational health

---

### 12. 100 Real-Time Commands

Harumi fetches current data directly from external live APIs:

- **Discord Live**: `.serverlive`, `.memberslive`, `.onlinelive`, `.voicelive`, `.channelalive`, `.rolelive`, `.boostlive`, `.botlatency`, `.apilive`, `.uptime`
- **Weather**: `.weather <city>`, `.forecast`, `.hourly`, `.feelslike`, `.humidity`, `.wind`, `.uv`, `.sunrise`, `.sunset`
- **Time & Date**: `.time <tz>`, `.date`, `.timezone`, `.utc`, `.unix`, `.countdown`, `.timer`, `.age`, `.daysuntil`, `.week`
- **Currency & Finance**: `.currency <amt> <from> <to>`, `.rates`, `.fiat`, `.crypto <coin>`, `.btc`, `.eth`, `.gas`, `.coincompare`, `.marketcap`
- **Market Data**: `.stock <symbol>`, `.stocks`, `.stockchart`, `.market`, `.gold`, `.silver`, `.oil`, `.marketstatus`
- **News**: `.news`, `.worldnews`, `.technews`, `.gamingnews`, `.sportsnews`, `.latest`, `.headline`, `.searchnews`, `.breaking`
- **Gaming Live**: `.robloxuser <user>`, `.robloxstatus`, `.minecraftserver <address>`, `.steam <appid>`, `.gamestatus`
- **Community Social**: `.member`, `.presence`, `.voice`, `.activity`, `.roles`, `.joined`, `.serverboosters`, `.recentjoins`
- **Web Utilities**: `.qr <text>`, `.shorten <url>`, `.translate <lang> <text>`, `.define <word>`, `.synonym <word>`, `.ipinfo <ip>`, `.dns <domain>`, `.http <url>`
- **Internet Status**: `.status <svc>`, `.discordstatus`, `.internet`, `.website <url>`, `.ssl <domain>`, `.pinghost <host>`, `.live`

---

### 13. Configuration Reference

All settings can be inspected via `.welcpreview` or adjusted in the web dashboard. Settings survive bot reboots, guild ownership transfers, and network reconnects.

---

### 14. Troubleshooting & Diagnostics

- **Bot not responding to messages?**
  - Verify **Message Content Intent** is enabled in the Discord Developer Portal.
  - Verify bot has **Send Messages** and **Embed Links** in the channel.
- **Voice TTS not audible?**
  - Ensure bot has **Connect** and **Speak** permissions in the voice channel.
  - Ensure `ffmpeg` is installed on the host system.
- **Health check?**
  - Visit `http://localhost:3000/health`. Should return `{"status":"ok","database":"healthy"}`.

---

### 15. Live AI Voice Talk Mode (`.setuptalk` & `.stoptalk`)

Harumi includes persistent **Live AI Voice Talk Mode** allowing Harumi to actively converse with members in voice channels:

1. **Start Talk Mode:**
   ```
   .setuptalk [channelId]
   ```
   - Harumi automatically scans the server's voice channels, selects an accessible channel with active human members, and joins.
   - Begins listening for speech with Voice Activity Detection (VAD).
   - Generates natural, concise conversational replies and speaks them via TTS.
   - **Debounce & Silence Timing:** Waits 1.5 seconds of silence before answering to let members finish complete sentences.
   - **Interruption Support:** If a member speaks while Harumi is talking, Harumi immediately stops playback.
   - **Disconnect / Kick Recovery:** If Harumi is moved or disconnected, it automatically searches for another populated eligible voice channel and reconnects with rate-limit protection.

2. **Stop Talk Mode:**
   ```
   .stoptalk
   ```
   - Immediately stops listening, halts audio playback, clears TTS queue, and disconnects.
   - Returns: `"Live Talk Mode stopped."`

---

### 16. 24/7 Hosting on FreeVPS with Bore Tunnel

Harumi can run 24/7 on any Linux VPS, including [FreeVPS](https://github.com/cybershadowvps/FreeVPS), using the automated setup script and [Bore](https://github.com/ekzhang/bore) for public web access:

1. **Clone and run the automated setup script:**
   ```bash
   git clone https://github.com/your-repo/harumi.git
   cd harumi
   chmod +x ./scripts/vps-setup.sh ./scripts/start-vps.sh
   ./scripts/vps-setup.sh
   ```
   This automatically installs:
   - Node.js 20 LTS & build essentials
   - FFmpeg (for Discord audio streaming & TTS)
   - PM2 daemon manager
   - Bore tunnel CLI

2. **Configure `.env`:**
   ```bash
   cp .env.example .env
   nano .env
   ```
   Add your `DISCORD_TOKEN`.

3. **Start 24/7 runner with Bore tunnel:**
   ```bash
   ./scripts/start-vps.sh
   ```
   - Harumi starts as a persistent background daemon via PM2.
   - The web dashboard on port 3000 is automatically exposed via Bore tunnel.
   - Check your public dashboard URL with:
     ```bash
     pm2 logs harumi-tunnel
     ```

---

### 17. Docker Deployment

Build and run using Docker Compose:

```bash
docker-compose up -d --build
```

Monitor logs:
```bash
docker-compose logs -f
```
