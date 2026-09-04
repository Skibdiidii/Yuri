# What's New / Patch Notes

## Version Update - Dual-Bot Architecture & Global Server Links (Latest)

### 🚀 Dual-Bot Infrastructure
- **Russian Controller Bot (`1545467399493521478`)**: Handles music, fun games, and core automation.
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
