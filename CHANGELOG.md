# What's New / Patch Notes

## Version Update - Stability & Reliability Patch (Latest)

### 📚 Documentation & User Experience
- **Integrated Setup Tutorial**: Added a new interactive "Quick Setup Tutorial" section to the Companion Service dashboard and the main repository README.
- **Improved Onboarding**: Explicitly documented the relationship between the Russian Controller and Server Actions bots, command access via the `/` interface, and the recommended use of the Automation Console with the `.` prefix.
- **Permission Awareness**: Added warnings regarding server-specific external app permission constraints.

### 🛡️ Security & Access Control Hardening
- **Russian Bot Lockdown**: Implemented a global permission firewall for the **Russian Controller Bot**. Only authorized Yuri selfbot users can now execute commands, use interactive buttons, or submit modals. Unauthorized users attempting to use the bot will receive an immediate access denial message.
- **Slash Command Registry Fix**: Resolved a critical `APPLICATION_COMMANDS_DUPLICATE_NAME` error that was preventing the Russian Bot from registering new commands. Pruned duplicate entries in the global command array.
- **Improved Music Error Messaging**: Updated `/playmusic` and `/radio` with clearer error feedback. If the bot is used in a server where it hasn't been invited yet, it now explicitly requests a server invite rather than showing a generic voice error.
- **Interaction Flow Optimization**: Implemented `deferReply` for all music and radio commands to prevent **"Interaction Failed"** and **"Unknown Interaction"** errors during search and connection phases.
- **Reliable Interaction Acknowledgement**: Fixed `Interaction already acknowledged` errors by implementing more robust checks on interaction states before sending replies or error follow-ups.
- **Ephemeral Search Status**: Search processes now correctly display an ephemeral (private) status to the user while the audio engine connects to the voice channel.

## Version Update - Dual-Bot Architecture & Global Server Links

### 🚀 Dual-Bot Infrastructure
- **Russian Controller Bot (`1545467399493521478`)**: Handles music, fun games, and core automation.
- **Automatic Voice Channel Sync**: The Russian Bot now monitors your voice state—when you join a VC, it automatically commands your Yuri selfbot account to follow you instantly.
- **Server Actions Bot (`1545528232898465893`)**: Dedicated for moderation and administrative server actions.
- **Smart Bot Verification**: Commands requiring the Server Bot now perform a presence check and send ephemeral OAuth2 warnings if the bot is missing.

### 🛡️ Enhanced Moderation Suite
- **New Command `/kick`**: Securely kick members from the server.
- **New Command `/ban`**: Ban users with optional reason and message deletion history.
- **New Command `/timeout`**: Temporarily silence members for a specific duration.
- **New Command `/slowmode`**: Control channel message rate limits instantly.
- **Bulk Purge Fixes**: Improved `/purge` reliability with Server Bot integration.

### 🎮 New Utility & Fun Commands
- **Interactive "Run Commands" Console**: Added a high-visibility button on `.help` that opens a 15+ option select menu for instant execution of moderation, games, and radio.
- **Manual Command Entry**: New modal-based manual command runner for rapid text-based execution.
- **New Command `/ship`**: Interactive love compatibility calculator between users.
- **New Command `/hack`**: Simulated terminal-style terminal animation for fun interactions.
- **New Command `/whitelisted`**: View the list of authorized Yuri Companion users.

### 📢 Broadcast & Interaction Refinement
- **Reliable Guild Resolution**: Fixed a critical issue where the **Russian Controller Bot** would fail music playback in servers when used as a User App. The bot now intelligently resolves guild context and member voice states from its local cache.
- **Universal `/say` & `/embed`**: Now fully functional in **DMs and Group DMs**, removing the guild-only restriction.
- **Reliable Dispatch Flow**: Fixed an issue where broadcast messages weren't sending correctly by transitioning to **Interaction Webhooks (`followUp`)**.
- **Ephemeral Confirmation**: Commands now reply with a private "Dispatching..." status immediately to prevent timeout errors, followed by the public embed.
- **Broadcast Aesthetics**: Removed "Sent by user" footers from `/say` and `/embed` for a cleaner, official look.

### 🔗 Global Link Synchronization
- **New Official Discord Server**: All invite links updated to `https://discord.gg/eaEB3q7pEb`.
- **System-Wide Updates**: Redirects updated in the Web Dashboard, Slash Commands, and Raid/Broadcast messages.

## Version Update - Slash Command System Revamp & 24/7 Voice Music Engine

### 🌟 New Features & Enhancements
- **Clean Slash Command Suite**:
  - Restructured and pruned slash commands to exclusively retain high-impact utilities: `/help`, `/russian`, `/give`, `/playmusic`, `/leavevc`, and `/loop`.
  - Removed legacy slash command clutter for a responsive, streamlined Discord interaction experience.
- **`/russian` (Russian Roulette)**:
  - Interactive 6-chamber roulette game with random lethal chamber chance and rich color-coded embed feedback.
- **`/give` (Owner-Only Role Granting)**:
  - Secure role assignment command restricted to the authorized owner.
- **`/playmusic` (24/7 Voice Channel Music Streaming)**:
  - Real-time audio streaming from YouTube queries and direct links with voice state connectivity.
- **`/leavevc` & `/loop`**:
  - Voice channel disconnect and continuous track repeating toggles.
- **Voice Gateway Connectivity**:
  - Configured `GatewayIntentBits.GuildVoiceStates` to ensure persistent voice channel connectivity and gateway events.
- **Interactive Multi-Page Help Embed**:
  - Dynamic `/help` directory with category pages and interactive pagination buttons.
