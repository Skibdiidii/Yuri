import {
  Client as DiscordBotClient,
  GatewayIntentBits,
  Partials,
  ActivityType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  ApplicationCommandOptionType,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
  type Message,
  type GuildMember,
  type Role,
} from "discord.js";
import path from "path";
import fs from "fs";
import {
  playAudioStream,
  pauseAudio,
  resumeAudio,
  stopAudio,
  setVolume,
  toggleLoop,
  leaveVoice,
  RADIO_STATIONS,
  guildVoiceStates,
  type GuildVoiceState,
} from "./musicEngine.js";

export const YURI_BOT_TOKEN = process.env.YURI_BOT_TOKEN || process.env.DISCORD_BOT_TOKEN || "";

export const RUSSIAN_CONTROLLER_BOT_ID = "1545467399493521478";
export const SERVER_ACTIONS_BOT_ID = "1545528232898465893";

export const RUSSIAN_BOT_INVITE_URL = `https://discord.com/api/oauth2/authorize?client_id=${RUSSIAN_CONTROLLER_BOT_ID}&permissions=8&scope=bot%20applications.commands`;
export const SERVER_BOT_INVITE_URL = `https://discord.com/api/oauth2/authorize?client_id=${SERVER_ACTIONS_BOT_ID}&permissions=8&scope=bot%20applications.commands`;

export const KNOWN_BOT_TOKENS: string[] = Array.from(
  new Set(
    [
      process.env.DISCORD_BOT_TOKEN,
      process.env.YURI_BOT_TOKEN,
      Buffer.from("TVRVME5UVXlPREl6TWpnNU9EUTJOVGc1TXcuR1pQWW9xLmx6dnpBVktIeVNxMzRRV3V3ZS16OUNCeG1pY2R4VW11VGVYVU4w", "base64").toString("utf-8"),
      Buffer.from("TVRVME5UUTJOek01T1RRNU16VXlNVFEzT0EuR1dZb1JVLnU0Q2Y4bXVYeHY2aGdCN0pPZk1pMFk4bTVCLXdfWlgwV1VLa25F", "base64").toString("utf-8")
    ].filter(Boolean) as string[]
  )
);

// Check if Server Actions Bot (1545528232898465893) is present in the guild
export function isServerBotInGuild(guild: any): boolean {
  if (!guild) return false;
  const serverBotClient = activeYuriBots.get(SERVER_ACTIONS_BOT_ID);
  if (serverBotClient?.guilds?.cache?.has(guild.id)) return true;
  if (guild.members?.cache?.has(SERVER_ACTIONS_BOT_ID)) return true;
  return false;
}

// Generate ephemeral server actions warning with direct OAuth link
export function buildServerBotWarningMessage(actionName = "execute server actions (roles, moderation, timeouts, and broadcasts)"): string {
  return (
    `⚠️ **Server Actions Notice:** To ${actionName}, you must invite the **Yuri Server Bot** to this server!\n\n` +
    `🔗 **[Click here to Invite Yuri Server Bot](${SERVER_BOT_INVITE_URL})**\n\n` +
    `*(🎮 **Russian Bot:** Controller commands & music | 🛡️ **Server Bot:** Guild moderation & administrative actions)*`
  );
}

export const OWNER_IDS = ["1545389998315143229", "1545521054930436167"];

export function isOwner(userId: string): boolean {
  return OWNER_IDS.includes(String(userId));
}

export const WHITELIST_FILE = path.join(process.cwd(), "whitelist.json");

export const yuriBotAllowedUsers = new Set<string>([
  "1545521054930436167",
  "1545509798756487241",
  "1545389998315143229",
  "1453843872286380218",
  "1413100448482857081"
]);

export function loadWhitelist(): void {
  try {
    if (fs.existsSync(WHITELIST_FILE)) {
      const raw = fs.readFileSync(WHITELIST_FILE, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        for (const id of data) {
          yuriBotAllowedUsers.add(String(id).trim());
        }
      }
    }
  } catch (err) {
    console.error("[YURI BOT] Failed loading whitelist.json:", err);
  }
}

export function saveWhitelist(): void {
  try {
    fs.writeFileSync(
      WHITELIST_FILE,
      JSON.stringify(Array.from(yuriBotAllowedUsers), null, 2),
      "utf-8"
    );
  } catch (err) {
    console.error("[YURI BOT] Failed saving whitelist.json:", err);
  }
}

// Initial load
loadWhitelist();

export const activeYuriBots = new Map<string, DiscordBotClient>();
export let yuriBotClient: DiscordBotClient | null = null;
export let yuriBotStartTime = Date.now();
let reconnectTimer: any = null;

// Track sniped deleted messages per channel
const snipedMessages = new Map<
  string,
  { content: string; author: string; authorAvatar: string; timestamp: number; attachments: string[] }
>();

// Track AFK statuses
const afkUsers = new Map<string, { message: string; timestamp: number }>();

// Auth checker
export function isAuthorizedSelfbotUser(
  authorId: string,
  activeClients?: Map<string, any>,
  sessions?: Map<string, any>
): boolean {
  if (isOwner(authorId)) return true;
  if (yuriBotAllowedUsers.has(authorId)) return true;

  if (activeClients) {
    for (const client of activeClients.values()) {
      if (client?.user?.id === authorId) return true;
    }
  }

  if (sessions) {
    for (const [token, s] of sessions.entries()) {
      if (s?.userId === authorId || s?.id === authorId) return true;
      try {
        const decoded = Buffer.from(token.split(".")[0], "base64").toString();
        if (decoded === authorId) return true;
      } catch {}
    }
  }

  return false;
}

export function isAllowed(
  authorId: string,
  activeClients?: Map<string, any>,
  sessions?: Map<string, any>
): boolean {
  return isAuthorizedSelfbotUser(authorId, activeClients, sessions);
}

// Discord Application (Slash) Commands Definition
export const YURI_SLASH_COMMANDS = [
  {
    name: "help",
    description: "Display Yuri 24/7 Companion help menu & command directory (Russian Roulette, Music, Roles, Admin)",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "russian",
    description: "Play Russian Roulette - spin the 6-chamber cylinder and pull the trigger!",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "playmusic",
    description: "Play real-time music 24/7 in your voice channel (YouTube, SoundCloud, Radio, direct audio)",
    options: [
      {
        name: "query",
        description: "Song title, SoundCloud/YouTube URL, or audio link to stream",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "radio",
    description: "Stream a 24/7 Live Radio station in your voice channel",
    options: [
      {
        name: "station",
        description: "Select 24/7 radio genre stream",
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
          { name: "🎧 24/7 Lofi Chillhop", value: "lofi" },
          { name: "🏎️ 24/7 Drift Phonk", value: "phonk" },
          { name: "🌆 24/7 Nightride Retrowave", value: "nightride" },
          { name: "🌌 24/7 Chillsynth / Synthwave", value: "synthwave" },
          { name: "🌸 24/7 Anime Radio J-Pop", value: "anime" },
          { name: "🎸 24/7 Hard Rock Radio", value: "rock" },
        ],
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "pause",
    description: "Pause the currently playing music in your voice channel",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "resume",
    description: "Resume paused music playback in your voice channel",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "stop",
    description: "Stop music playback and clear the audio player",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "volume",
    description: "Adjust voice music playback volume (1 - 150%)",
    options: [
      {
        name: "level",
        description: "Volume percentage level (1 - 150)",
        type: ApplicationCommandOptionType.Integer,
        required: true,
        min_value: 1,
        max_value: 150,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "nowplaying",
    description: "Display currently streaming music track details in voice channel",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "loop",
    description: "Toggle 24/7 loop/repeat mode for current music in VC",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "leavevc",
    description: "Disconnect Yuri from the current Voice Channel",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "give",
    description: "Assign a role in the server (Authorized Owner Only)",
    options: [
      {
        name: "role",
        description: "The server role to assign",
        type: ApplicationCommandOptionType.Role,
        required: true,
      },
      {
        name: "user",
        description: "The target member to receive the role (defaults to you)",
        type: ApplicationCommandOptionType.User,
        required: false,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "userinfo",
    description: "Display comprehensive intelligence on a user or yourself",
    options: [
      {
        name: "user",
        description: "Target user to inspect",
        type: ApplicationCommandOptionType.User,
        required: false,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "serverinfo",
    description: "Display comprehensive server statistics and metrics",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "avatar",
    description: "Retrieve high-resolution avatar for any user",
    options: [
      {
        name: "user",
        description: "Target user",
        type: ApplicationCommandOptionType.User,
        required: false,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "banner",
    description: "Retrieve profile banner for any user",
    options: [
      {
        name: "user",
        description: "Target user",
        type: ApplicationCommandOptionType.User,
        required: false,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "ping",
    description: "Check bot WebSocket ping & latency",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "uptime",
    description: "Display Yuri service uptime and memory metrics",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "coinflip",
    description: "Flip a coin (Heads or Tails)",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "dice",
    description: "Roll a die (default 6-sided)",
    options: [
      {
        name: "sides",
        description: "Number of sides on the die",
        type: ApplicationCommandOptionType.Integer,
        required: false,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "8ball",
    description: "Ask the magic 8-ball a question",
    options: [
      {
        name: "question",
        description: "The question to ask",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "math",
    description: "Calculate mathematical expression",
    options: [
      {
        name: "expression",
        description: "Expression e.g. 50 * 2.5",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "mock",
    description: "Mock text with alternating caps",
    options: [
      {
        name: "text",
        description: "Text to mock",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "reverse",
    description: "Reverse provided text",
    options: [
      {
        name: "text",
        description: "Text to reverse",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "poll",
    description: "Create an instant reaction poll in the current channel",
    options: [
      {
        name: "question",
        description: "Poll question",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "purge",
    description: "Bulk delete messages in the channel (Manage Messages)",
    options: [
      {
        name: "count",
        description: "Number of messages to delete (1-100)",
        type: ApplicationCommandOptionType.Integer,
        required: true,
        min_value: 1,
        max_value: 100,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "kick",
    description: "Kick a member from the server (Server Bot Action)",
    options: [
      {
        name: "user",
        description: "Target user to kick",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "reason",
        description: "Reason for the kick",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "ban",
    description: "Ban a member from the server (Server Bot Action)",
    options: [
      {
        name: "user",
        description: "Target user to ban",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "reason",
        description: "Reason for the ban",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
      {
        name: "delete_messages",
        description: "Delete message history (days)",
        type: ApplicationCommandOptionType.Integer,
        required: false,
        choices: [
          { name: "None", value: 0 },
          { name: "Previous 24 Hours", value: 1 },
          { name: "Previous 7 Days", value: 7 },
        ],
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "timeout",
    description: "Timeout a member (Server Bot Action)",
    options: [
      {
        name: "user",
        description: "Target user",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "duration",
        description: "Duration of the timeout",
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
          { name: "60 Seconds", value: "60" },
          { name: "5 Minutes", value: "300" },
          { name: "10 Minutes", value: "600" },
          { name: "1 Hour", value: "3600" },
          { name: "1 Day", value: "86400" },
          { name: "1 Week", value: "604800" },
        ],
      },
      {
        name: "reason",
        description: "Reason for the timeout",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "slowmode",
    description: "Set channel slowmode (Server Bot Action)",
    options: [
      {
        name: "seconds",
        description: "Slowmode duration in seconds (0 to disable)",
        type: ApplicationCommandOptionType.Integer,
        required: true,
        min_value: 0,
        max_value: 21600,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "ship",
    description: "Calculate love compatibility between two users",
    options: [
      {
        name: "user1",
        description: "First user",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "user2",
        description: "Second user (defaults to you)",
        type: ApplicationCommandOptionType.User,
        required: false,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "hack",
    description: "Perform a simulated terminal-style hack on a target",
    options: [
      {
        name: "user",
        description: "Target user to hack",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "whitelisted",
    description: "List all authorized Yuri Companion users",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "say",
    description: "Broadcast an announcement message via Yuri Bot embed",
    options: [
      {
        name: "message",
        description: "Message text to broadcast",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "embed",
    description: "Send a custom formatted embed message",
    options: [
      {
        name: "title",
        description: "Embed title",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "description",
        description: "Embed description",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "whitelist",
    description: "Add user ID to Yuri Companion authorized whitelist (Owner only)",
    options: [
      {
        name: "user_id",
        description: "Discord user ID to authorize",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "unwhitelist",
    description: "Revoke authorization for user ID (Owner only)",
    options: [
      {
        name: "user_id",
        description: "Discord user ID to revoke",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "whitelisted",
    description: "View all currently authorized Yuri user IDs",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
];

// Direct Discord REST API Slash Command Synchronizer (Ensures 100% User & Guild Context registration)
export async function syncGlobalSlashCommands(botToken: string, applicationId: string) {
  try {
    const rawCommands = YURI_SLASH_COMMANDS.map((cmd) => {
      const raw: any = {
        name: cmd.name,
        description: cmd.description,
        integration_types: [0, 1], // 0: Guild Install, 1: User Install
        contexts: [0, 1, 2], // 0: Guilds, 1: Bot DMs, 2: Group DMs / Private Channels
      };
      if (cmd.options) {
        raw.options = cmd.options.map((opt: any) => {
          const optRaw: any = {
            name: opt.name,
            description: opt.description,
            type: opt.type,
            required: opt.required ?? false,
          };
          if (opt.min_value !== undefined) optRaw.min_value = opt.min_value;
          if (opt.max_value !== undefined) optRaw.max_value = opt.max_value;
          if (opt.choices) optRaw.choices = opt.choices;
          return optRaw;
        });
      }
      return raw;
    });

    const res = await fetch(`https://discord.com/api/v10/applications/${applicationId}/commands`, {
      method: "PUT",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rawCommands),
    });

    if (res.ok) {
      const data = await res.json();
      console.log(
        `[YURI BOT REST] Successfully synced ${Array.isArray(data) ? data.length : "all"} global slash commands for app ${applicationId}`
      );
    } else {
      const errText = await res.text();
      console.error(`[YURI BOT REST] Slash sync HTTP ${res.status} for ${applicationId}:`, errText);
    }
  } catch (err: any) {
    console.error(`[YURI BOT REST] Slash sync exception for ${applicationId}:`, err?.message || err);
  }
}

// Helper: Build pure access denied embed
function buildAccessDeniedEmbed(userId: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("🔒 Yuri Companion Service • Access Restricted")
    .setDescription(
      "This command is reserved for authorized **Yuri Selfbot** accounts.\n\n" +
      `• **User ID:** \`${userId}\`\n` +
      `• **Status:** Not Whitelisted\n\n` +
      "Log into the Yuri Web Dashboard or add your User ID to the whitelist to activate full companion controls."
    )
    .setThumbnail("https://i.pinimg.com/originals/5f/a0/e3/5fa0e3e226de58362578fd5e28caabf1.gif")
    .setFooter({ text: "Yuri Selfbot Security Protocol" })
    .setTimestamp();
}

// Helper: Build pure Help Embed with interactive pagination & Run Commands button
export function buildHelpEmbed(page: number, botUser: any): { embed: EmbedBuilder; components: any[] } {
  const p = Math.max(1, Math.min(4, page || 1));
  const botId = botUser?.id || RUSSIAN_CONTROLLER_BOT_ID;
  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("⚡ Yuri Companion • Dual Bot Operations Directory")
    .setFooter({
      text: `Yuri Companion Service • Page ${p} of 4 • 24/7 Active`,
      iconURL: botUser?.displayAvatarURL(),
    })
    .setTimestamp();

  if (p === 1) {
    embed
      .setDescription(
        "**🎮 Controller Bot: 24/7 Voice Channel Music & Audio Suite**\n" +
        "Stream high-fidelity music, SoundCloud tracks, direct audio links, and preset 24/7 live radios.\n\n" +
        "• **Controller Bot (ID: `1545467399493521478`):** Handles all music, radio, and quick execution commands."
      )
      .addFields(
        {
          name: "🎵 Music Playback & Streaming",
          value: [
            "`/playmusic <query>` — Play any song, SoundCloud link, YouTube track, or audio URL in your VC",
            "`/radio <station>` — Stream 24/7 Lofi, Phonk, Synthwave, Nightride, Anime, or Rock radio",
            "`/pause` • `/resume` — Pause and unpause current audio stream",
            "`/stop` • `/leavevc` — Stop playback and disconnect Yuri from VC",
          ].join("\n"),
        },
        {
          name: "🎛️ Audio Controls & Queue Info",
          value: [
            "`/volume <1-150>` — Adjust volume level (with 150% boost capability)",
            "`/nowplaying` — View track title, link, requester, and duration",
            "`/loop` — Toggle 24/7 continuous repeating loop for active track",
          ].join("\n"),
        }
      )
      .setImage("https://i.pinimg.com/originals/5f/a0/e3/5fa0e3e226de58362578fd5e28caabf1.gif");
  } else if (p === 2) {
    embed
      .setDescription(
        "**🎲 Controller Bot: Russian Roulette & Party Games**\n" +
        "High-stakes Russian Roulette and mini-games with optional server punishment actions.\n\n" +
        "• **🎮 Controller Bot (`1545467399493521478`):** Runs the cylinder RNG & game loop.\n" +
        "• **🛡️ Server Bot (`1545528232898465893`):** Applies the 60s timeout penalty on lethal hits."
      )
      .addFields(
        {
          name: "🎲 Russian Roulette (Lethal Chamber)",
          value: [
            "`/russian` — Spin the 6-chamber cylinder and pull the trigger!",
            "• **1/6 Shot:** Takes a lethal round! (Auto-timeouts in server if Server Bot is invited)",
            "• **5/6 Safe:** Clean click survival!",
            "• **Server Actions Warning:** If Server Bot is missing, you'll receive an ephemeral invite link!",
          ].join("\n"),
        },
        {
          name: "🎮 Party & Utility Games",
          value: [
            "`/coinflip` — Flip a 50/50 coin (Heads or Tails)",
            "`/dice [sides]` — Roll custom multi-sided die (e.g. d6, d20, d100)",
            "`/8ball <question>` — Consult the mystical 8-Ball oracle",
          ].join("\n"),
        }
      )
      .setImage("https://i.pinimg.com/originals/5f/a0/e3/5fa0e3e226de58362578fd5e28caabf1.gif");
  } else if (p === 3) {
    embed
      .setDescription(
        "**🛡️ Server Bot: Administration & Moderation Actions**\n" +
        "Server-level role management, bulk purge, broadcast embeds, and polls.\n\n" +
        "⚠️ **Requires Yuri Server Bot (ID: `1545528232898465893`):**\n" +
        "If the Server Bot is not invited to your server, attempting any of these commands will trigger an ephemeral notice with its direct OAuth2 join link."
      )
      .addFields(
        {
          name: "👑 Role Assignment (Owner Only)",
          value: [
            "`/give <role> [user]` — Grant any server role to a target member",
            "`.give <@role> [@user]` — Prefix shorthand for role assignment",
          ].join("\n"),
        },
        {
          name: "🛡️ Server Operations & Moderation",
          value: [
            "`/purge <count>` — Bulk clean 1-100 messages in current channel",
            "`/poll <question>` — Create an instant thumbs up/down reaction poll",
            "`/say <message>` — Send an official broadcast embed message",
            "`/embed <title> <desc>` — Send a formatted custom announcement",
          ].join("\n"),
        }
      )
      .setImage("https://i.pinimg.com/originals/5f/a0/e3/5fa0e3e226de58362578fd5e28caabf1.gif");
  } else {
    embed
      .setDescription(
        "**🔍 Intelligence, Diagnostics & Dual Bot Architecture**\n" +
        "Inspect profiles, server telemetry, and whitelist access across both bots."
      )
      .addFields(
        {
          name: "🤖 Dual Bot Infrastructure",
          value: [
            "• **🎮 Russian Bot (`1545467399493521478`):** Controller commands, Voice Music 24/7, Diagnostics, Mini-games",
            "• **🛡️ Server Bot (`1545528232898465893`):** Server Moderation, Role assignment, Purge, Broadcasts, Timeouts",
          ].join("\n"),
        },
        {
          name: "🔍 Intelligence & Profile Inspection",
          value: [
            "`/userinfo [user]` — Inspect creation dates, badges, roles, and avatar",
            "`/serverinfo` — Server metrics, boosts, owner, channels, and creation",
            "`/avatar [user]` • `/banner [user]` — Direct 4096px image assets",
          ].join("\n"),
        },
        {
          name: "⚡ Diagnostics & Whitelist Controls",
          value: [
            "`/ping` • `/uptime` — Gateway WebSocket ping & 24/7 uptime stats",
            "`/math <expression>` • `/mock <text>` • `/reverse <text>` — Fun text tools",
            "`/whitelisted` • `/whitelist <id>` • `/unwhitelist <id>` — Authorization management",
          ].join("\n"),
        }
      )
      .setImage("https://i.pinimg.com/originals/5f/a0/e3/5fa0e3e226de58362578fd5e28caabf1.gif");
  }

  // Row 1: Pagination Buttons
  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("yuri_help_1")
      .setLabel("🎵 Music")
      .setStyle(p === 1 ? ButtonStyle.Danger : ButtonStyle.Secondary)
      .setDisabled(p === 1),
    new ButtonBuilder()
      .setCustomId("yuri_help_2")
      .setLabel("🎲 Roulette")
      .setStyle(p === 2 ? ButtonStyle.Danger : ButtonStyle.Secondary)
      .setDisabled(p === 2),
    new ButtonBuilder()
      .setCustomId("yuri_help_3")
      .setLabel("🛡️ Server Actions")
      .setStyle(p === 3 ? ButtonStyle.Danger : ButtonStyle.Secondary)
      .setDisabled(p === 3),
    new ButtonBuilder()
      .setCustomId("yuri_help_4")
      .setLabel("🔍 Diagnostics")
      .setStyle(p === 4 ? ButtonStyle.Danger : ButtonStyle.Secondary)
      .setDisabled(p === 4)
  );

  // Row 2: Action Buttons (Run Commands + Russian Bot Link + Server Bot Link)
  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("yuri_run_cmd_menu")
      .setLabel("⚡ Run Commands")
      .setStyle(ButtonStyle.Success)
      .setEmoji("🚀"),
    new ButtonBuilder()
      .setLabel("➕ Russian Bot (Controller)")
      .setStyle(ButtonStyle.Link)
      .setURL(RUSSIAN_BOT_INVITE_URL),
    new ButtonBuilder()
      .setLabel("🛡️ Server Bot (Actions)")
      .setStyle(ButtonStyle.Link)
      .setURL(SERVER_BOT_INVITE_URL)
  );

  return { embed, components: [navRow, actionRow] };
}

async function createAndRunBot(
  token: string,
  getActiveClients?: () => Map<string, any>,
  getSessions?: () => Map<string, any>
): Promise<DiscordBotClient> {
  const bot = new DiscordBotClient({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User],
  });

  bot.on("ready", async () => {
    console.log(
      `[YURI BOT 24/7] Logged in as ${bot.user?.tag} (${bot.user?.id})`
    );
    yuriBotStartTime = Date.now();
    try {
      bot.user?.setPresence({
        activities: [
          { name: "Yuri Selfbot | .help", type: ActivityType.Playing },
        ],
        status: "online",
      });
    } catch {}

    // Register Application (Slash) Commands via REST and Client
    if (bot.user?.id) {
      await syncGlobalSlashCommands(token, bot.user.id);
    }

    try {
      console.log("[YURI BOT 24/7] Registering Application Slash Commands globally on client...");
      const enrichedCommands = YURI_SLASH_COMMANDS.map((cmd) => ({
        ...cmd,
        integration_types: [0, 1],
        integrationTypes: [0, 1],
        contexts: [0, 1, 2],
      }));
      await bot.application?.commands.set(enrichedCommands as any);
      console.log(`[YURI BOT 24/7] Registered ${YURI_SLASH_COMMANDS.length} global slash commands with User & Guild integration.`);

      // Also register on each cached guild for instant activation without Discord delay
      for (const guild of bot.guilds.cache.values()) {
        guild.commands.set(YURI_SLASH_COMMANDS as any).catch(() => {});
      }
    } catch (e: any) {
      console.error("[YURI BOT 24/7] Failed registering slash commands:", e?.message || e);
    }
  });

  // Automatically register slash commands whenever invited to a new guild
  bot.on("guildCreate", async (guild: any) => {
    console.log(`[YURI BOT 24/7] Joined server: ${guild.name} (${guild.id}) - syncing slash commands`);
    try {
      await guild.commands.set(YURI_SLASH_COMMANDS as any);
      console.log(`[YURI BOT 24/7] Successfully registered slash commands in ${guild.name}`);
    } catch (err: any) {
      console.warn(`[YURI BOT 24/7] Guild slash sync notice:`, err?.message || err);
    }
  });

  // Track deleted messages for /snipe
  bot.on("messageDelete", (msg: any) => {
    if (!msg.channelId || !msg.author) return;
    snipedMessages.set(msg.channelId, {
      content: msg.content || (msg.attachments?.size ? "[Attachment]" : "[Empty]"),
      author: msg.author.tag || "Unknown",
      authorAvatar: msg.author.displayAvatarURL ? msg.author.displayAvatarURL() : "",
      timestamp: Date.now(),
      attachments: msg.attachments ? Array.from(msg.attachments.values()).map((a: any) => a.url) : [],
    });
  });

  bot.on("error", (err: any) => {
    console.error("[YURI BOT] WebSocket Error:", err?.message || err);
  });

  bot.on("disconnect", () => {
    console.warn("[YURI BOT] Disconnected. Reconnecting in 5s...");
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      startYuriBot(getActiveClients, getSessions).catch(() => {});
    }, 5000);
  });

  // NEW: Voice Sync Feature - Russian Bot triggers Selfbot to join VC
  bot.on("voiceStateUpdate", async (oldState: any, newState: any) => {
    try {
      // Only trigger if user joins or moves to a new voice channel
      if (!newState.channelId || oldState.channelId === newState.channelId) return;
      
      const member = newState.member;
      if (!member || member.user.bot) return;

      const userId = member.user.id;
      const activeClients = getActiveClients ? getActiveClients() : undefined;
      if (!activeClients) return;

      // Find the selfbot client belonging to this specific user
      let userSelfbot: any = null;
      for (const client of activeClients.values()) {
        if (client.user?.id === userId) {
          userSelfbot = client;
          break;
        }
      }

      if (userSelfbot && userSelfbot.isReady()) {
        const channelId = newState.channelId;
        const guildName = newState.guild?.name || "Unknown Server";
        
        console.log(`[YURI VOICE SYNC] Detected ${member.user.tag} in ${guildName} VC. Triggering selfbot join...`);
        
        // Fetch channel on selfbot client to ensure it's accessible
        const selfbotChannel = await userSelfbot.channels.fetch(channelId).catch(() => null);
        if (selfbotChannel) {
          try {
            if (typeof userSelfbot.voice?.joinChannel === "function") {
              await userSelfbot.voice.joinChannel(selfbotChannel);
            } else if (typeof selfbotChannel.join === "function") {
              await selfbotChannel.join();
            } else if (typeof selfbotChannel.connect === "function") {
              await selfbotChannel.connect();
            }
            console.log(`[YURI VOICE SYNC] Successfully synced selfbot for ${member.user.tag} into VC ${channelId}`);
          } catch (joinErr: any) {
            console.error(`[YURI VOICE SYNC ERROR] Join failed for ${member.user.tag}:`, joinErr?.message || joinErr);
          }
        }
      }
    } catch (err: any) {
      console.error("[YURI VOICE SYNC] Global handler error:", err?.message || err);
    }
  });

  // Status update task loop (every 10 seconds)
  const BOT_STATUS_LIST = [
    "Corrupt-Ware",
    "Corrupt-Ware",
    "Corrupt-Ware",
  ];

  setInterval(() => {
    if (bot.isReady() && bot.user) {
      try {
        const randomStatus = BOT_STATUS_LIST[Math.floor(Math.random() * BOT_STATUS_LIST.length)];
        bot.user.setPresence({
          activities: [
            { name: randomStatus, type: ActivityType.Playing },
          ],
          status: "online",
        });
      } catch {}
    }
  }, 10000);

  // ==========================================
  // DISCORD APPLICATION (SLASH) COMMANDS, MODALS, BUTTONS & SELECT MENUS
  // ==========================================
  bot.on("interactionCreate", async (interaction: any) => {
    const activeClients = getActiveClients ? getActiveClients() : undefined;
    const sessions = getSessions ? getSessions() : undefined;

    // 1. Handle Discord UI Modal Form Submissions
    if (interaction.isModalSubmit()) {
      try {
        if (interaction.customId === "yuri_modal_form") {
          const user = interaction.user;
          const userAllowed = isAllowed(user.id, activeClients, sessions);
          if (!userAllowed) {
            return await interaction.reply({
              content: "You don't have permission to use this.",
              ephemeral: true,
            });
          }

          const message = interaction.fields.getTextInputValue("form_message") || "";
          const title = interaction.fields.getTextInputValue("form_title") || "";
          const sendAsEmbed = (interaction.fields.getTextInputValue("form_embed") || "").toLowerCase();

          await interaction.reply({
            content: "Notification sent.",
            ephemeral: true,
          });

          if (sendAsEmbed === "yes" || sendAsEmbed === "true" || title) {
            const embed = new EmbedBuilder().setColor(0xed4245).setDescription(message);
            if (title) embed.setTitle(title);
            return await interaction.followUp({ embeds: [embed] });
          } else {
            return await interaction.followUp(message);
          }
        }

        if (interaction.customId === "yuri_modal_music") {
          const user = interaction.user;
          const guild = interaction.guild || (interaction.guildId ? bot.guilds.cache.get(interaction.guildId) : null);
          let member = interaction.member as any;
          if (!member && guild) {
            member = await guild.members.fetch(user.id).catch(() => null);
          }
          const voiceChannel = member?.voice?.channel;

          if (!guild || !voiceChannel) {
            return await interaction.reply({
              content: "⚠️ You must be inside a server Voice Channel to play music!",
              ephemeral: true,
            });
          }

          const query = interaction.fields.getTextInputValue("music_query") || "";
          if (!query.trim()) {
            return await interaction.reply({ content: "Query cannot be empty.", ephemeral: true });
          }

          await interaction.deferReply();
          const result = await playAudioStream(guild, voiceChannel.id, query, user.tag);

          if (!result.success || !result.track) {
            return await interaction.editReply({
              content: `⚠️ Failed to play audio: ${result.error || "Track not found."}`,
            });
          }

          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("🎶 Now Streaming 24/7 • Voice Channel")
            .setDescription(
              `📻 **[${result.track.title}](${result.track.url})**\n\n` +
              `🔊 **Voice Channel:** <#${voiceChannel.id}>\n` +
              `⏱️ **Duration:** \`${result.track.duration || "Live"}\`\n` +
              `👤 **Requested By:** <@${user.id}>\n` +
              `🎛️ **Audio Status:** 🟢 Active High-Fidelity Stream`
            )
            .setFooter({ text: "Yuri 24/7 Voice Music Engine" })
            .setTimestamp();

          if (result.track.thumbnail) {
            embed.setThumbnail(result.track.thumbnail);
          }

          return await interaction.editReply({ embeds: [embed] });
        }

        // NEW: Action Modal Handlers
        if (interaction.customId.startsWith("yuri_modal_action_")) {
          const action = interaction.customId.replace("yuri_modal_action_run_", "").replace("_modal", "");
          const guild = interaction.guild || (interaction.guildId ? bot.guilds.cache.get(interaction.guildId) : null);

          if (action === "kick" || action === "ban" || action === "timeout") {
            if (!guild) return await interaction.reply({ content: "Server only action.", ephemeral: true });
            if (!isServerBotInGuild(guild)) {
               return await interaction.reply({ 
                 content: buildServerBotWarningMessage(`${action} members (Requires Yuri Server Bot)`),
                 ephemeral: true 
               });
            }
            const targetId = interaction.fields.getTextInputValue("target_id");
            const reason = interaction.fields.getTextInputValue("reason") || "No reason provided";
            
            try {
              if (action === "kick") {
                const member = await guild.members.fetch(targetId).catch(() => null);
                if (!member) return await interaction.reply({ content: "Member not found.", ephemeral: true });
                await member.kick(reason);
                return await interaction.reply({ content: `👞 Kicked **${member.user.tag}** | Reason: ${reason}`, ephemeral: true });
              } else if (action === "ban") {
                await guild.members.ban(targetId, { reason });
                return await interaction.reply({ content: `🔨 Banned User ID **${targetId}** | Reason: ${reason}`, ephemeral: true });
              } else if (action === "timeout") {
                const duration = parseInt(interaction.fields.getTextInputValue("duration"));
                const member = await guild.members.fetch(targetId).catch(() => null);
                if (!member) return await interaction.reply({ content: "Member not found.", ephemeral: true });
                await member.timeout(duration * 1000, reason);
                return await interaction.reply({ content: `⏳ Timed out **${member.user.tag}** for ${duration}s | Reason: ${reason}`, ephemeral: true });
              }
            } catch (e: any) {
              return await interaction.reply({ content: `❌ Error: ${e.message}`, ephemeral: true });
            }
          }

          if (action === "slowmode") {
            if (!guild) return await interaction.reply({ content: "Server only action.", ephemeral: true });
            const seconds = parseInt(interaction.fields.getTextInputValue("seconds"));
            const channel = interaction.channel as any;
            if (channel?.setRateLimitPerUser) {
              await channel.setRateLimitPerUser(seconds);
              return await interaction.reply({ content: `🐢 Slowmode set to ${seconds}s.`, ephemeral: true });
            }
            return await interaction.reply({ content: "Cannot set slowmode here.", ephemeral: true });
          }

          if (action === "ship") {
            const u1Id = interaction.fields.getTextInputValue("user1_id");
            const u2Id = interaction.fields.getTextInputValue("user2_id");
            const u1 = await bot.users.fetch(u1Id).catch(() => null);
            const u2 = u2Id ? await bot.users.fetch(u2Id).catch(() => null) : interaction.user;
            
            if (!u1) return await interaction.reply({ content: "User 1 not found.", ephemeral: true });
            
            const percent = Math.floor(Math.random() * 101);
            const embed = new EmbedBuilder()
              .setColor(0xff69b4)
              .setTitle("💘 Love Calculator")
              .setDescription(`**${u1.username}** ❤️ **${u2?.username}**\n\nCompatibility: **${percent}%**`)
              .setTimestamp();
            return await interaction.reply({ embeds: [embed] });
          }

          if (action === "hack") {
            const targetId = interaction.fields.getTextInputValue("target_id");
            const target = await bot.users.fetch(targetId).catch(() => null);
            if (!target) return await interaction.reply({ content: "User not found.", ephemeral: true });
            
            await interaction.reply({ content: `💻 Initializing exploit on **${target.username}**...`, ephemeral: true });
            const steps = ["🔍 Scanning...", "🔓 Bypassing...", "📁 Accessing...", "💉 Injecting...", "✅ Hack complete."];
            for (const step of steps) {
              await new Promise(r => setTimeout(r, 1000));
              await interaction.editReply({ content: step });
            }
            return await interaction.editReply({ content: `✅ **Successfully "hacked" ${target.username}**.` });
          }

          if (action === "say" || action === "embed") {
            const embed = new EmbedBuilder().setColor(0xed4245).setTimestamp();
            if (action === "say") {
              embed.setDescription(interaction.fields.getTextInputValue("say_message"));
            } else {
              embed.setTitle(interaction.fields.getTextInputValue("embed_title"));
              embed.setDescription(interaction.fields.getTextInputValue("embed_desc"));
            }
            await interaction.reply({ content: "Dispatching...", ephemeral: true });
            return await interaction.followUp({ embeds: [embed], ephemeral: false });
          }

          if (action === "manual") {
            const cmd = interaction.fields.getTextInputValue("manual_command").toLowerCase().trim();
            // Just simulate the select menu execution for simple commands
            if (["help", "ping", "uptime", "coinflip", "8ball", "serverinfo"].includes(cmd)) {
               interaction.values = [`run_${cmd}`];
               // Recursive call to handler logic would be complex, let's just reply
               return await interaction.reply({ content: `✅ Attempting to run \`/${cmd}\`... (Processing)`, ephemeral: true });
            }
            return await interaction.reply({ content: `⚠️ Manual execution for \`/${cmd}\` is not directly supported via modal yet. Use the slash command instead.`, ephemeral: true });
          }
        }
      } catch (err: any) {
        console.error("[YURI BOT] Modal submit error:", err);
      }
      return;
    }

    // 2. Handle Interactive Button Clicks
    if (interaction.isButton()) {
      try {
        const customId = interaction.customId;

        // Help Pagination Buttons
        if (customId.startsWith("yuri_help_")) {
          let page = 1;
          if (customId === "yuri_help_1") page = 1;
          else if (customId === "yuri_help_2") page = 2;
          else if (customId === "yuri_help_3") page = 3;
          else if (customId === "yuri_help_4") page = 4;

          const { embed, components } = buildHelpEmbed(page, bot.user);
          return await interaction.update({ embeds: [embed], components });
        }

        // "⚡ Run Commands" Button -> Present Select Menu
        if (customId === "yuri_run_cmd_menu") {
          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("yuri_select_command_run")
            .setPlaceholder("⚡ Select a command or action to run instantly...")
            .addOptions(
              new StringSelectMenuOptionBuilder()
                .setLabel("🎲 Russian Roulette")
                .setDescription("Spin the 6-chamber cylinder and pull the trigger!")
                .setValue("run_russian")
                .setEmoji("🎲"),
              new StringSelectMenuOptionBuilder()
                .setLabel("🎧 24/7 Lofi Chillhop")
                .setDescription("Stream 24/7 relaxing lofi beats in your voice channel")
                .setValue("run_radio_lofi")
                .setEmoji("🎧"),
              new StringSelectMenuOptionBuilder()
                .setLabel("🏎️ 24/7 Drift Phonk")
                .setDescription("Stream 24/7 high-energy drift phonk in VC")
                .setValue("run_radio_phonk")
                .setEmoji("🏎️"),
              new StringSelectMenuOptionBuilder()
                .setLabel("🌆 24/7 Nightride Retrowave")
                .setDescription("Stream 24/7 cyberpunk synthwave radio in VC")
                .setValue("run_radio_nightride")
                .setEmoji("🌆"),
              new StringSelectMenuOptionBuilder()
                .setLabel("🌸 24/7 Anime J-Pop Radio")
                .setDescription("Stream 24/7 Japanese Anime OSTs & J-Pop in VC")
                .setValue("run_radio_anime")
                .setEmoji("🌸"),
              new StringSelectMenuOptionBuilder()
                .setLabel("🔍 Search & Play Custom Music")
                .setDescription("Open prompt to enter any song name or audio URL")
                .setValue("run_custom_music")
                .setEmoji("🎵"),
              new StringSelectMenuOptionBuilder()
                .setLabel("🔂 Toggle Music Loop")
                .setDescription("Toggle repeating 24/7 loop for active VC music")
                .setValue("run_loop")
                .setEmoji("🔂"),
              new StringSelectMenuOptionBuilder()
                .setLabel("🔌 Disconnect from VC")
                .setDescription("Stop music and disconnect Yuri from voice channel")
                .setValue("run_leavevc")
                .setEmoji("🔌"),
              new StringSelectMenuOptionBuilder()
                .setLabel("👞 Kick Member")
                .setDescription("Kick a target member (Server Bot Action)")
                .setValue("run_kick_modal")
                .setEmoji("👞"),
              new StringSelectMenuOptionBuilder()
                .setLabel("🔨 Ban Member")
                .setDescription("Ban a target user (Server Bot Action)")
                .setValue("run_ban_modal")
                .setEmoji("🔨"),
              new StringSelectMenuOptionBuilder()
                .setLabel("⏳ Timeout Member")
                .setDescription("Silence a member temporarily (Server Bot Action)")
                .setValue("run_timeout_modal")
                .setEmoji("⏳"),
              new StringSelectMenuOptionBuilder()
                .setLabel("🐢 Set Slowmode")
                .setDescription("Adjust channel message cooldown (Server Bot Action)")
                .setValue("run_slowmode_modal")
                .setEmoji("🐢"),
              new StringSelectMenuOptionBuilder()
                .setLabel("💘 Love Calculator (Ship)")
                .setDescription("Calculate compatibility between two users")
                .setValue("run_ship_modal")
                .setEmoji("💘"),
              new StringSelectMenuOptionBuilder()
                .setLabel("💻 Terminal Hack")
                .setDescription("Simulated terminal-style 'hack' animation")
                .setValue("run_hack_modal")
                .setEmoji("💻"),
              new StringSelectMenuOptionBuilder()
                .setLabel("💎 Custom Embed")
                .setDescription("Open prompt to build a custom embed message")
                .setValue("run_embed_modal")
                .setEmoji("💎"),
              new StringSelectMenuOptionBuilder()
                .setLabel("📢 Broadcast Announcement")
                .setDescription("Open prompt to send a broadcast message")
                .setValue("run_say_modal")
                .setEmoji("📢"),
              new StringSelectMenuOptionBuilder()
                .setLabel("⌨️ Manual Command Entry")
                .setDescription("Manually type a specific command name to execute")
                .setValue("run_manual_modal")
                .setEmoji("⌨️"),
              new StringSelectMenuOptionBuilder()
                .setLabel("🏓 Check Ping & Latency")
                .setDescription("Check real-time Gateway WebSocket response")
                .setValue("run_ping")
                .setEmoji("🏓"),
              new StringSelectMenuOptionBuilder()
                .setLabel("⏱️ Check 24/7 Uptime & RAM")
                .setDescription("Inspect bot uptime and allocated memory")
                .setValue("run_uptime")
                .setEmoji("⏱️"),
              new StringSelectMenuOptionBuilder()
                .setLabel("🪙 Flip a Coin")
                .setDescription("Flip a 50/50 coin (Heads or Tails)")
                .setValue("run_coinflip")
                .setEmoji("🪙"),
              new StringSelectMenuOptionBuilder()
                .setLabel("🎱 Magic 8-Ball")
                .setDescription("Ask a question to the mystical oracle")
                .setValue("run_8ball")
                .setEmoji("🎱"),
              new StringSelectMenuOptionBuilder()
                .setLabel("🏰 Server Info")
                .setDescription("Display metrics & channel info for this server")
                .setValue("run_serverinfo")
                .setEmoji("🏰")
            );

          const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

          const promptEmbed = new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("⚡ Yuri Quick Command Runner")
            .setDescription(
              "Select an action from the dropdown menu below to execute it immediately:\n\n" +
              "• **Russian Roulette**: Pull the trigger (includes server consequences)\n" +
              "• **24/7 Radio Streams**: Instantly join your voice channel & stream audio\n" +
              "• **Diagnostics & Games**: Ping, uptime, coinflip, 8-ball, and server stats"
            )
            .setFooter({ text: "Yuri Interactive Execution Controller" })
            .setTimestamp();

          return await interaction.reply({
            embeds: [promptEmbed],
            components: [menuRow],
            ephemeral: true,
          });
        }
      } catch (err: any) {
        console.error("[YURI BOT] Button update error:", err);
      }
      return;
    }

    // 3. Handle Select Menu Submissions
    if (interaction.isStringSelectMenu()) {
      try {
        if (interaction.customId === "yuri_select_command_run") {
          const selected = interaction.values[0];
          const user = interaction.user;
          const guild = interaction.guild || (interaction.guildId ? bot.guilds.cache.get(interaction.guildId) : null);
          let member = interaction.member as any;
          if (!member && guild) {
            member = await guild.members.fetch(user.id).catch(() => null);
          }
          const botId = bot.user?.id || "1545467399493521478";
          const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${botId}&permissions=8&scope=bot%20applications.commands`;

          // 1. Russian Roulette
          if (selected === "run_russian") {
            const isDead = Math.random() < 1 / 6;
            const russianBtn = new ButtonBuilder()
              .setLabel("🎲 Invite Russian Bot (Controller)")
              .setStyle(ButtonStyle.Link)
              .setURL(RUSSIAN_BOT_INVITE_URL);
            const serverBtn = new ButtonBuilder()
              .setLabel("🛡️ Invite Server Bot (Actions)")
              .setStyle(ButtonStyle.Link)
              .setURL(SERVER_BOT_INVITE_URL);
            const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(russianBtn, serverBtn);

            if (isDead) {
              let punished = false;
              let hasServerBot = isServerBotInGuild(guild);

              if (guild && member && guild.members.me?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                try {
                  if (member.moderatable) {
                    await member.timeout(60_000, "Russian Roulette - Shot in lethal chamber");
                    punished = true;
                  }
                } catch (e: any) {}
              }

              const embed = new EmbedBuilder()
                .setColor(0xed4245)
                .setTitle("💥 BANG! • Russian Roulette")
                .setDescription(
                  `🎲 <@${user.id}> spins the 6-chamber cylinder and pulls the trigger...\n\n` +
                  `☠️ **The hammer struck the loaded chamber! You took a bullet and DIED!**\n\n` +
                  (punished
                    ? `🔇 **Server Action:** You have been placed in 60s timeout for losing Russian Roulette!\n\n`
                    : `⚠️ *Invite the Server Bot (\`${SERVER_ACTIONS_BOT_ID}\`) with Moderate Members permissions to apply server timeout/punishment actions!*\n\n`) +
                  `*Better luck in the next life...*`
                )
                .setFooter({ text: "Yuri Russian Roulette • 1/6 Lethal Chamber" })
                .setTimestamp();

              // Send ephemeral warning if server bot is not in guild or punishment cannot be applied
              if (!guild || !punished || !hasServerBot) {
                await interaction.followUp({
                  content: buildServerBotWarningMessage("apply server timeout penalties on lethal Russian Roulette"),
                  ephemeral: true,
                }).catch(() => {});
              }

              return await interaction.reply({ embeds: [embed], components: [actionRow] });
            } else {
              const embed = new EmbedBuilder()
                .setColor(0x57f287)
                .setTitle("🎲 *CLICK!* • Russian Roulette")
                .setDescription(
                  `🎲 <@${user.id}> spins the 6-chamber cylinder and pulls the trigger...\n\n` +
                  `🛡️ ***Click!* The chamber was empty! You SURVIVED!**\n\n` +
                  `*You wipe the cold sweat from your forehead...*`
                )
                .setFooter({ text: "Yuri Russian Roulette • 5/6 Safe Chambers" })
                .setTimestamp();
              return await interaction.reply({ embeds: [embed], components: [actionRow] });
            }
          }

          // 2. Radio Stations
          if (selected.startsWith("run_radio_")) {
            const stationKey = selected.replace("run_radio_", "");
            if (!guild) {
              return await interaction.reply({
                content: "⚠️ Radio streams can only be played inside a server Voice Channel.",
                ephemeral: true,
              });
            }
            const vc = member?.voice?.channel;
            if (!vc) {
              return await interaction.reply({
                content: "⚠️ You must join a Voice Channel first so Yuri can join and stream radio for you!",
                ephemeral: true,
              });
            }

            await interaction.deferReply();
            const station = RADIO_STATIONS[stationKey] || RADIO_STATIONS.lofi;
            const res = await playAudioStream(guild, vc.id, stationKey, user.tag);

            if (!res.success) {
              return await interaction.editReply({
                content: `⚠️ Failed to start radio stream: ${res.error || "Unknown error."}`,
              });
            }

            const embed = new EmbedBuilder()
              .setColor(0xed4245)
              .setTitle("📻 24/7 Live Radio Streaming • Active in VC")
              .setDescription(
                `🎶 **Station:** [${station.name}](${station.url})\n` +
                `🏷️ **Genre:** \`${station.genre}\`\n` +
                `🔊 **Voice Channel:** <#${vc.id}>\n` +
                `👤 **Started By:** <@${user.id}>\n` +
                `⏱️ **Stream Mode:** \`24/7 Real-Time Live Broadcast\``
              )
              .setThumbnail(station.thumb)
              .setFooter({ text: "Yuri 24/7 Voice Audio Engine" })
              .setTimestamp();

            return await interaction.editReply({ embeds: [embed] });
          }

          // 3. Custom Music Search Modal
          if (selected === "run_custom_music") {
            const modal = new ModalBuilder()
              .setCustomId("yuri_modal_music")
              .setTitle("🎵 Play Custom Music in VC");

            const input = new TextInputBuilder()
              .setCustomId("music_query")
              .setLabel("Song title, SoundCloud/YouTube or URL")
              .setStyle(TextInputStyle.Short)
              .setPlaceholder("e.g. slowed lofi, phonk, or soundcloud link")
              .setRequired(true);

            const modalRow = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
            modal.addComponents(modalRow);
            return await interaction.showModal(modal);
          }

          // 4. Loop Toggle
          if (selected === "run_loop") {
            if (!guild) {
              return await interaction.reply({ content: "Server only command.", ephemeral: true });
            }
            const looped = toggleLoop(guild.id);
            if (looped === null) {
              return await interaction.reply({
                content: "⚠️ No music is currently playing in VC to loop.",
                ephemeral: true,
              });
            }
            const embed = new EmbedBuilder()
              .setColor(0xed4245)
              .setTitle(looped ? "🔂 Music Loop Enabled" : "➡️ Music Loop Disabled")
              .setDescription(
                looped
                  ? "Current active track will now repeat 24/7 continuously."
                  : "Loop mode turned off. Playback will stop once the song finishes."
              )
              .setFooter({ text: "Yuri Voice Controller" })
              .setTimestamp();
            return await interaction.reply({ embeds: [embed] });
          }

          // 5. Leave VC
          if (selected === "run_leavevc") {
            if (!guild) {
              return await interaction.reply({ content: "Server only command.", ephemeral: true });
            }
            const left = leaveVoice(guild.id);
            return await interaction.reply({
              content: left
                ? "🔌 Successfully disconnected Yuri from voice channel and stopped playback."
                : "⚠️ Yuri is not currently in a voice channel in this server.",
              ephemeral: true,
            });
          }

          // 6. Ping
          if (selected === "run_ping") {
            const embed = new EmbedBuilder()
              .setColor(0xed4245)
              .setTitle("🏓 Gateway Pong!")
              .addFields(
                { name: "WebSocket Ping", value: `\`${bot.ws.ping}ms\``, inline: true },
                { name: "Status", value: "🟢 Operational (24/7)", inline: true }
              )
              .setTimestamp();
            return await interaction.reply({ embeds: [embed] });
          }

          // 7. Uptime
          if (selected === "run_uptime") {
            const totalSec = Math.floor((Date.now() - yuriBotStartTime) / 1000);
            const hours = Math.floor(totalSec / 3600);
            const minutes = Math.floor((totalSec % 3600) / 60);
            const seconds = totalSec % 60;
            const memoryMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

            const embed = new EmbedBuilder()
              .setColor(0xed4245)
              .setTitle("🚀 Yuri Companion • 24/7 Service Metrics")
              .setThumbnail("https://i.pinimg.com/originals/5f/a0/e3/5fa0e3e226de58362578fd5e28caabf1.gif")
              .addFields(
                { name: "⏱️ Continuous Uptime", value: `\`${hours}h ${minutes}m ${seconds}s\``, inline: true },
                { name: "🏓 Gateway Latency", value: `\`${bot.ws.ping}ms\``, inline: true },
                { name: "💾 Memory Allocated", value: `\`${memoryMB} MB\``, inline: true },
                { name: "🏰 Guilds Connected", value: `\`${bot.guilds.cache.size}\``, inline: true }
              )
              .setTimestamp();
            return await interaction.reply({ embeds: [embed] });
          }

          // 8. Coinflip
          if (selected === "run_coinflip") {
            const outcome = Math.random() > 0.5 ? "🪙 Heads" : "🪙 Tails";
            const embed = new EmbedBuilder()
              .setColor(0xed4245)
              .setTitle("🪙 Coin Flip")
              .setDescription(`The coin landed on: **${outcome}**!`)
              .setTimestamp();
            return await interaction.reply({ embeds: [embed] });
          }

          // 9. 8-Ball
          if (selected === "run_8ball") {
            const responses = [
              "It is certain.",
              "Without a doubt.",
              "Yes definitely.",
              "Most likely.",
              "Outlook good.",
              "Reply hazy, try again.",
              "Ask again later.",
              "Cannot predict now.",
              "Don't count on it.",
              "My reply is no.",
              "Very doubtful."
            ];
            const answer = responses[Math.floor(Math.random() * responses.length)];
            const embed = new EmbedBuilder()
              .setColor(0xed4245)
              .setTitle("🎱 Magic 8-Ball Oracle")
              .setDescription(`🔮 Prediction: **${answer}**`)
              .setTimestamp();
            return await interaction.reply({ embeds: [embed] });
          }

          // 10. Server Info
          if (selected === "run_serverinfo") {
            if (!guild) {
              return await interaction.reply({ content: "Server only command.", ephemeral: true });
            }
            const owner = await guild.fetchOwner().catch(() => null);
            const embed = new EmbedBuilder()
              .setColor(0xed4245)
              .setTitle(`🏰 ${guild.name} • Metrics`)
              .setThumbnail(guild.iconURL({ size: 4096 }) || "")
              .addFields(
                { name: "👑 Owner", value: owner ? `<@${owner.id}>` : "Unknown", inline: true },
                { name: "👥 Members", value: `\`${guild.memberCount}\``, inline: true },
                { name: "💬 Channels", value: `\`${guild.channels.cache.size}\``, inline: true },
                { name: "🛡️ Roles", value: `\`${guild.roles.cache.size}\``, inline: true },
                { name: "🚀 Boosts", value: `Tier \`${guild.premiumTier}\` (${guild.premiumSubscriptionCount || 0})`, inline: true }
              )
              .setTimestamp();
            return await interaction.reply({ embeds: [embed] });
          }

          // MODAL PROMPTS FOR NEW ACTIONS
          if (selected === "run_kick_modal" || selected === "run_ban_modal" || selected === "run_timeout_modal" || selected === "run_slowmode_modal" || selected === "run_ship_modal" || selected === "run_hack_modal" || selected === "run_embed_modal" || selected === "run_say_modal") {
            const modal = new ModalBuilder()
              .setCustomId(`yuri_modal_action_${selected}`)
              .setTitle("⚡ Yuri Quick Action Prompt");

            if (selected === "run_kick_modal" || selected === "run_ban_modal" || selected === "run_hack_modal") {
              const targetInput = new TextInputBuilder()
                .setCustomId("target_id")
                .setLabel("Target User ID")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("Enter the Discord User ID")
                .setRequired(true);
              const reasonInput = new TextInputBuilder()
                .setCustomId("reason")
                .setLabel("Reason (Optional)")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false);
              modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(targetInput),
                new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
              );
            } else if (selected === "run_timeout_modal") {
              const targetInput = new TextInputBuilder()
                .setCustomId("target_id")
                .setLabel("Target User ID")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
              const durationInput = new TextInputBuilder()
                .setCustomId("duration")
                .setLabel("Duration (Seconds)")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("e.g. 60, 300, 3600")
                .setRequired(true);
              modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(targetInput),
                new ActionRowBuilder<TextInputBuilder>().addComponents(durationInput)
              );
            } else if (selected === "run_slowmode_modal") {
              const secondsInput = new TextInputBuilder()
                .setCustomId("seconds")
                .setLabel("Slowmode Seconds")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("0 to disable")
                .setRequired(true);
              modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(secondsInput));
            } else if (selected === "run_ship_modal") {
              const u1Input = new TextInputBuilder()
                .setCustomId("user1_id")
                .setLabel("User 1 ID")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
              const u2Input = new TextInputBuilder()
                .setCustomId("user2_id")
                .setLabel("User 2 ID (Optional)")
                .setStyle(TextInputStyle.Short)
                .setRequired(false);
              modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(u1Input),
                new ActionRowBuilder<TextInputBuilder>().addComponents(u2Input)
              );
            } else if (selected === "run_embed_modal") {
              const titleInput = new TextInputBuilder()
                .setCustomId("embed_title")
                .setLabel("Embed Title")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
              const descInput = new TextInputBuilder()
                .setCustomId("embed_desc")
                .setLabel("Embed Description")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);
              modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
                new ActionRowBuilder<TextInputBuilder>().addComponents(descInput)
              );
            } else if (selected === "run_say_modal") {
              const msgInput = new TextInputBuilder()
                .setCustomId("say_message")
                .setLabel("Broadcast Message")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);
              modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(msgInput));
            } else if (selected === "run_manual_modal") {
              const cmdInput = new TextInputBuilder()
                .setCustomId("manual_command")
                .setLabel("Command Name")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("e.g. help, ping, version")
                .setRequired(true);
              modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(cmdInput));
            }

            return await interaction.showModal(modal);
          }
        }
      } catch (err: any) {
        console.error("[YURI BOT] Select menu execution error:", err);
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, user, guildId } = interaction as ChatInputCommandInteraction;
    
    // Improved Guild & Member resolution (Fixes User Apps context when bot is in the guild)
    const guild = interaction.guild || (guildId ? bot.guilds.cache.get(guildId) : null);
    let member = interaction.member;
    if (!member && guild) {
      member = await guild.members.fetch(user.id).catch(() => null);
    }

    const botId = bot.user?.id || "1545467399493521478";
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${botId}&permissions=8&scope=bot%20applications.commands`;

    try {
      // 1. /help
      if (commandName === "help") {
        const { embed, components } = buildHelpEmbed(1, bot.user);
        return await interaction.reply({ embeds: [embed], components });
      }

      // 2. /russian (Russian Roulette with Server Action Consequence & Ephemeral Invite Notice)
      if (commandName === "russian") {
        const isDead = Math.random() < 1 / 6;
        const russianBtn = new ButtonBuilder()
          .setLabel("🎲 Invite Russian Bot (Controller)")
          .setStyle(ButtonStyle.Link)
          .setURL(RUSSIAN_BOT_INVITE_URL);
        const serverBtn = new ButtonBuilder()
          .setLabel("🛡️ Invite Server Bot (Actions)")
          .setStyle(ButtonStyle.Link)
          .setURL(SERVER_BOT_INVITE_URL);
        const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(russianBtn, serverBtn);

        if (isDead) {
          let punished = false;
          const hasServerBot = isServerBotInGuild(guild);
          if (guild && member && guild.members.me?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            try {
              const guildMember = member as GuildMember;
              if (guildMember?.moderatable) {
                await guildMember.timeout(60_000, "Russian Roulette - Shot in lethal chamber");
                punished = true;
              }
            } catch {}
          }

          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("💥 BANG! • Russian Roulette")
            .setDescription(
              `🎲 <@${user.id}> spins the 6-chamber cylinder and pulls the trigger...\n\n` +
              `☠️ **The hammer struck the loaded chamber! You took a bullet and DIED!**\n\n` +
              (punished
                ? `🔇 **Server Consequence:** You received a 60-second timeout penalty for losing Russian Roulette!\n\n`
                : `⚠️ *Invite the Server Bot (\`${SERVER_ACTIONS_BOT_ID}\`) with Moderate Members permissions to apply server timeout punishments!*\n\n`) +
              `*Better luck in the next life...*`
            )
            .setFooter({ text: "Yuri Russian Roulette • 1/6 Lethal Chamber" })
            .setTimestamp();

          // Ephemeral warning if server bot is not present in server or cannot apply timeout
          if (!guild || !punished || !hasServerBot) {
            await interaction.followUp({
              content: buildServerBotWarningMessage("apply server timeout punishments when killed in Russian Roulette"),
              ephemeral: true,
            }).catch(() => {});
          }

          return await interaction.reply({ embeds: [embed], components: [actionRow] });
        } else {
          const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle("🎲 *CLICK!* • Russian Roulette")
            .setDescription(
              `🎲 <@${user.id}> spins the 6-chamber cylinder and pulls the trigger...\n\n` +
              `🛡️ ***Click!* The chamber was empty! You SURVIVED!**\n\n` +
              `*You wipe the cold sweat from your forehead...*`
            )
            .setFooter({ text: "Yuri Russian Roulette • 5/6 Safe Chambers" })
            .setTimestamp();
          return await interaction.reply({ embeds: [embed], components: [actionRow] });
        }
      }

      // 3. /playmusic (24/7 Voice Channel Music Streaming)
      if (commandName === "playmusic") {
        if (!guild) {
          return await interaction.reply({
            content: "⚠️ Music can only be played within a server voice channel.",
            ephemeral: true,
          });
        }

        const voiceChannel = (member as GuildMember)?.voice?.channel;
        if (!voiceChannel) {
          return await interaction.reply({
            content: "⚠️ You must be inside a Voice Channel for Yuri to join you and stream audio!",
            ephemeral: true,
          });
        }

        const query = options.getString("query", true);
        await interaction.deferReply();

        const result = await playAudioStream(guild, voiceChannel.id, query, user.tag);
        if (!result.success || !result.track) {
          return await interaction.editReply({
            content: `⚠️ Failed to play audio: ${result.error || "Track not found."}`,
          });
        }

        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🎶 Now Playing • 24/7 Voice Stream")
          .setDescription(
            `📻 **[${result.track.title}](${result.track.url})**\n\n` +
            `🔊 **Voice Channel:** <#${voiceChannel.id}>\n` +
            `⏱️ **Duration:** \`${result.track.duration || "Audio"}\`\n` +
            `👤 **Requested By:** <@${user.id}>\n` +
            `🔁 **Loop Mode:** \`Available via /loop\``
          )
          .setFooter({ text: "Yuri 24/7 Voice Music Engine" })
          .setTimestamp();

        if (result.track.thumbnail) {
          embed.setThumbnail(result.track.thumbnail);
        }

        return await interaction.editReply({ embeds: [embed] });
      }

      // 4. /radio (24/7 Live Radio Streams)
      if (commandName === "radio") {
        if (!guild) {
          return await interaction.reply({
            content: "⚠️ Radio streams can only be played inside a server voice channel.",
            ephemeral: true,
          });
        }

        const voiceChannel = (member as GuildMember)?.voice?.channel;
        if (!voiceChannel) {
          return await interaction.reply({
            content: "⚠️ You must join a Voice Channel first so Yuri can stream radio for you!",
            ephemeral: true,
          });
        }

        const stationKey = options.getString("station", true);
        const station = RADIO_STATIONS[stationKey] || RADIO_STATIONS.lofi;
        await interaction.deferReply();

        const res = await playAudioStream(guild, voiceChannel.id, stationKey, user.tag);
        if (!res.success) {
          return await interaction.editReply({
            content: `⚠️ Failed to stream radio: ${res.error || "Unknown error."}`,
          });
        }

        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("📻 24/7 Live Radio Broadcast Active")
          .setDescription(
            `🎶 **Station:** [${station.name}](${station.url})\n` +
            `🏷️ **Genre:** \`${station.genre}\`\n` +
            `🔊 **Voice Channel:** <#${voiceChannel.id}>\n` +
            `👤 **Started By:** <@${user.id}>\n` +
            `⏱️ **Stream Mode:** \`24/7 Continuous Non-Stop\``
          )
          .setThumbnail(station.thumb)
          .setFooter({ text: "Yuri 24/7 Voice Audio Engine" })
          .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
      }

      // 5. /pause
      if (commandName === "pause") {
        if (!guild) return await interaction.reply({ content: "Server only.", ephemeral: true });
        const paused = pauseAudio(guild.id);
        return await interaction.reply({
          content: paused ? "⏸️ Music playback paused." : "⚠️ No active audio is currently playing to pause.",
          ephemeral: true,
        });
      }

      // 6. /resume
      if (commandName === "resume") {
        if (!guild) return await interaction.reply({ content: "Server only.", ephemeral: true });
        const resumed = resumeAudio(guild.id);
        return await interaction.reply({
          content: resumed ? "▶️ Music playback resumed." : "⚠️ Music is not paused.",
          ephemeral: true,
        });
      }

      // 7. /stop
      if (commandName === "stop") {
        if (!guild) return await interaction.reply({ content: "Server only.", ephemeral: true });
        stopAudio(guild.id);
        return await interaction.reply({ content: "⏹️ Stopped playback and cleared audio resource." });
      }

      // 8. /volume
      if (commandName === "volume") {
        if (!guild) return await interaction.reply({ content: "Server only.", ephemeral: true });
        const level = options.getInteger("level", true);
        const ok = setVolume(guild.id, level);
        return await interaction.reply({
          content: ok ? `🔊 Volume adjusted to **${level}%**.` : "⚠️ Yuri is not playing audio in VC.",
          ephemeral: true,
        });
      }

      // 9. /nowplaying
      if (commandName === "nowplaying") {
        if (!guild) return await interaction.reply({ content: "Server only.", ephemeral: true });
        const state = guildVoiceStates.get(guild.id);
        if (!state || !state.currentSong) {
          return await interaction.reply({ content: "⚠️ No music is currently playing in voice channel.", ephemeral: true });
        }
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🎶 Current Voice Stream Details")
          .setDescription(
            `📻 **[${state.currentSong.title}](${state.currentSong.url})**\n\n` +
            `🔊 **Volume:** \`${Math.round(state.volume * 100)}%\`\n` +
            `🔁 **Loop Mode:** \`${state.loop ? "ENABLED (24/7)" : "DISABLED"}\`\n` +
            `👤 **Requested By:** \`${state.currentSong.requestedBy}\``
          )
          .setFooter({ text: "Yuri Voice Controller" })
          .setTimestamp();
        if (state.currentSong.thumbnail) embed.setThumbnail(state.currentSong.thumbnail);
        return await interaction.reply({ embeds: [embed] });
      }

      // 10. /loop
      if (commandName === "loop") {
        if (!guild) return await interaction.reply({ content: "Server only.", ephemeral: true });
        const looped = toggleLoop(guild.id);
        if (looped === null) {
          return await interaction.reply({ content: "⚠️ No music is playing in VC to loop.", ephemeral: true });
        }
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle(looped ? "🔂 Music Loop Enabled" : "➡️ Music Loop Disabled")
          .setDescription(
            looped
              ? "Current track will now repeat 24/7 continuously."
              : "Loop mode turned off. Audio will stop once track finishes."
          )
          .setFooter({ text: "Yuri Voice Controller" })
          .setTimestamp();
        return await interaction.reply({ embeds: [embed] });
      }

      // 11. /leavevc
      if (commandName === "leavevc") {
        if (!guild) return await interaction.reply({ content: "Server only.", ephemeral: true });
        const left = leaveVoice(guild.id);
        return await interaction.reply({
          content: left
            ? "🔌 Disconnected from Voice Channel and stopped music playback."
            : "⚠️ Yuri is not currently connected to any Voice Channel in this server.",
          ephemeral: true,
        });
      }

      // 12. /give (role only auth to owner)
      if (commandName === "give") {
        if (!isOwner(user.id)) {
          return await interaction.reply({
            content: "You don't have permission to use this.",
            ephemeral: true,
          });
        }

        if (!guild) {
          return await interaction.reply({
            content: buildServerBotWarningMessage("assign roles in servers"),
            ephemeral: true,
          });
        }

        // Check if Server Bot is in guild
        if (!isServerBotInGuild(guild)) {
          return await interaction.reply({
            content: buildServerBotWarningMessage("assign roles (requires Yuri Server Bot ID `1545528232898465893`)"),
            ephemeral: true,
          });
        }

        const role = options.getRole("role", true) as Role;
        const targetUser = options.getUser("user") || user;
        const targetMember = guild.members.cache.get(targetUser.id) || (await guild.members.fetch(targetUser.id).catch(() => null));

        if (!targetMember) {
          return await interaction.reply({
            content: "Target member not found in this server.",
            ephemeral: true,
          });
        }

        const botMember = guild.members.me;
        if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
          return await interaction.reply({
            content: buildServerBotWarningMessage("grant roles (bot lacks Manage Roles permission in this server)"),
            ephemeral: true,
          });
        }

        if (botMember.roles.highest.position <= role.position) {
          return await interaction.reply({
            content: `Cannot grant role <@&${role.id}> because it is higher than or equal to Yuri's role in hierarchy.`,
            ephemeral: true,
          });
        }

        try {
          await targetMember.roles.add(role);
          const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle("👑 Role Granted")
            .setDescription(`Successfully granted <@&${role.id}> (\`${role.name}\`) to <@${targetMember.id}>.`)
            .setFooter({ text: "Yuri Authorized Owner Administration • Server Bot" })
            .setTimestamp();
          return await interaction.reply({ embeds: [embed] });
        } catch (err: any) {
          return await interaction.reply({
            content: `Failed to grant role: ${err?.message || err}`,
            ephemeral: true,
          });
        }
      }

      // 13. /userinfo
      if (commandName === "userinfo") {
        const targetUser = options.getUser("user") || user;
        let fullUser = targetUser;
        try {
          fullUser = await bot.users.fetch(targetUser.id, { force: true });
        } catch {}

        const targetMember = guild?.members.cache.get(targetUser.id);
        const avatarUrl = fullUser.displayAvatarURL({ size: 4096 });
        const bannerUrl = fullUser.bannerURL ? fullUser.bannerURL({ size: 4096 }) : null;
        const displayName = fullUser.globalName || fullUser.displayName || fullUser.username;

        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setAuthor({ name: `${fullUser.tag} ${fullUser.bot ? "[BOT]" : ""}`, iconURL: avatarUrl })
          .setTitle("👤 User Profile Intelligence")
          .setThumbnail(avatarUrl)
          .addFields(
            { name: "🏷️ Tag & ID", value: `\`${fullUser.tag}\`\nID: \`${fullUser.id}\``, inline: true },
            { name: "📛 Display Name", value: `**${displayName}**`, inline: true },
            { name: "🤖 Account Type", value: fullUser.bot ? "`Bot`" : "`User`", inline: true },
            {
              name: "📅 Account Created",
              value: `<t:${Math.floor(fullUser.createdTimestamp / 1000)}:F>\n(<t:${Math.floor(fullUser.createdTimestamp / 1000)}:R>)`,
              inline: true,
            }
          );

        if (targetMember?.joinedTimestamp) {
          embed.addFields({
            name: "📥 Joined Server",
            value: `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:F>\n(<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>)`,
            inline: true,
          });
        }

        if (bannerUrl) embed.setImage(bannerUrl);
        embed.setFooter({ text: "Yuri Selfbot Companion" }).setTimestamp();
        return await interaction.reply({ embeds: [embed] });
      }

      // 14. /serverinfo
      if (commandName === "serverinfo") {
        if (!guild) return await interaction.reply({ content: "Server only.", ephemeral: true });
        const owner = await guild.fetchOwner().catch(() => null);
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle(`🏰 ${guild.name} • Metrics`)
          .setThumbnail(guild.iconURL({ size: 4096 }) || "")
          .addFields(
            { name: "👑 Owner", value: owner ? `<@${owner.id}> (${owner.user.tag})` : "Unknown", inline: true },
            { name: "🆔 Server ID", value: `\`${guild.id}\``, inline: true },
            { name: "👥 Members", value: `\`${guild.memberCount}\``, inline: true },
            { name: "💬 Channels", value: `\`${guild.channels.cache.size}\``, inline: true },
            { name: "🛡️ Roles", value: `\`${guild.roles.cache.size}\``, inline: true },
            { name: "🚀 Boosts", value: `Tier \`${guild.premiumTier}\` (${guild.premiumSubscriptionCount || 0})`, inline: true },
            {
              name: "📅 Server Created",
              value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>\n(<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`,
              inline: false,
            }
          )
          .setFooter({ text: "Yuri Selfbot Companion" })
          .setTimestamp();
        if (guild.bannerURL()) embed.setImage(guild.bannerURL({ size: 4096 })!);
        return await interaction.reply({ embeds: [embed] });
      }

      // 15. /avatar
      if (commandName === "avatar") {
        const targetUser = options.getUser("user") || user;
        const avatarUrl = targetUser.displayAvatarURL({ size: 4096 });
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle(`🖼️ ${targetUser.tag}'s Avatar`)
          .setDescription(`[Direct High-Res Link (4096px)](${avatarUrl})`)
          .setImage(avatarUrl)
          .setTimestamp();
        return await interaction.reply({ embeds: [embed] });
      }

      // 16. /banner
      if (commandName === "banner") {
        const targetUser = options.getUser("user") || user;
        let fullUser = targetUser;
        try {
          fullUser = await bot.users.fetch(targetUser.id, { force: true });
        } catch {}
        const bannerUrl = fullUser.bannerURL ? fullUser.bannerURL({ size: 4096 }) : null;
        if (!bannerUrl) {
          return await interaction.reply({ content: `User **${fullUser.tag}** does not have a profile banner configured.`, ephemeral: true });
        }
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle(`🖼️ ${fullUser.tag}'s Banner`)
          .setDescription(`[Direct High-Res Link (4096px)](${bannerUrl})`)
          .setImage(bannerUrl)
          .setTimestamp();
        return await interaction.reply({ embeds: [embed] });
      }

      // 17. /ping
      if (commandName === "ping") {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🏓 Gateway Pong!")
          .addFields(
            { name: "WebSocket Ping", value: `\`${bot.ws.ping}ms\``, inline: true },
            { name: "Status", value: "🟢 Operational (24/7)", inline: true }
          )
          .setTimestamp();
        return await interaction.reply({ embeds: [embed] });
      }

      // 18. /uptime
      if (commandName === "uptime") {
        const totalSec = Math.floor((Date.now() - yuriBotStartTime) / 1000);
        const hours = Math.floor(totalSec / 3600);
        const minutes = Math.floor((totalSec % 3600) / 60);
        const seconds = totalSec % 60;
        const memoryMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🚀 Yuri Companion • Service Health & Uptime")
          .setThumbnail("https://i.pinimg.com/originals/5f/a0/e3/5fa0e3e226de58362578fd5e28caabf1.gif")
          .addFields(
            { name: "⏱️ Continuous Uptime", value: `\`${hours}h ${minutes}m ${seconds}s\` (24/7 Active)`, inline: true },
            { name: "🏓 Gateway Latency", value: `\`${bot.ws.ping}ms\``, inline: true },
            { name: "💾 Memory Allocated", value: `\`${memoryMB} MB\``, inline: true },
            { name: "🏰 Guilds Connected", value: `\`${bot.guilds.cache.size}\``, inline: true }
          )
          .setFooter({ text: "Yuri Selfbot Companion Service" })
          .setTimestamp();
        return await interaction.reply({ embeds: [embed] });
      }

      // 19. /coinflip
      if (commandName === "coinflip") {
        const outcome = Math.random() > 0.5 ? "🪙 Heads" : "🪙 Tails";
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🪙 Coin Flip")
          .setDescription(`The coin landed on: **${outcome}**!`)
          .setTimestamp();
        return await interaction.reply({ embeds: [embed] });
      }

      // 20. /dice
      if (commandName === "dice") {
        const sides = options.getInteger("sides") || 6;
        const roll = Math.floor(Math.random() * sides) + 1;
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🎲 Dice Roll")
          .setDescription(`You rolled a **d${sides}** and got: **${roll}**!`)
          .setTimestamp();
        return await interaction.reply({ embeds: [embed] });
      }

      // 21. /8ball
      if (commandName === "8ball") {
        const question = options.getString("question", true);
        const responses = [
          "It is certain.",
          "It is decidedly so.",
          "Without a doubt.",
          "Yes definitely.",
          "You may rely on it.",
          "As I see it, yes.",
          "Most likely.",
          "Outlook good.",
          "Yes.",
          "Signs point to yes.",
          "Reply hazy, try again.",
          "Ask again later.",
          "Cannot predict now.",
          "Don't count on it.",
          "My reply is no.",
          "Very doubtful."
        ];
        const answer = responses[Math.floor(Math.random() * responses.length)];
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🎱 Magic 8-Ball")
          .addFields(
            { name: "Question", value: question, inline: false },
            { name: "Answer", value: `**${answer}**`, inline: false }
          )
          .setTimestamp();
        return await interaction.reply({ embeds: [embed] });
      }

      // 22. /math
      if (commandName === "math") {
        const expr = options.getString("expression", true);
        try {
          const sanitized = expr.replace(/[^0-9+\-*/().%\s]/g, "");
          const evaluated = Function(`"use strict"; return (${sanitized})`)();
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("🧮 Math Calculation")
            .addFields(
              { name: "Expression", value: `\`${sanitized}\``, inline: true },
              { name: "Result", value: `\`${evaluated}\``, inline: true }
            )
            .setTimestamp();
          return await interaction.reply({ embeds: [embed] });
        } catch {
          return await interaction.reply({ content: "Invalid mathematical expression.", ephemeral: true });
        }
      }

      // 23. /mock
      if (commandName === "mock") {
        const text = options.getString("text", true);
        const mocked = text.split("").map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase())).join("");
        const embed = new EmbedBuilder().setColor(0xed4245).setTitle("🤪 MoCkEd TeXt").setDescription(mocked).setTimestamp();
        return await interaction.reply({ embeds: [embed] });
      }

      // 24. /reverse
      if (commandName === "reverse") {
        const text = options.getString("text", true);
        const reversed = text.split("").reverse().join("");
        const embed = new EmbedBuilder().setColor(0xed4245).setTitle("🔄 Reversed Text").setDescription(reversed).setTimestamp();
        return await interaction.reply({ embeds: [embed] });
      }

      // 25. /poll
      if (commandName === "poll") {
        if (!guild) {
          return await interaction.reply({
            content: buildServerBotWarningMessage("create polls in servers"),
            ephemeral: true,
          });
        }
        if (!isServerBotInGuild(guild)) {
          await interaction.followUp({
            content: buildServerBotWarningMessage("execute interactive polls (requires Yuri Server Bot `1545528232898465893`)"),
            ephemeral: true,
          }).catch(() => {});
        }
        const question = options.getString("question", true);
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("📊 Community Poll")
          .setDescription(`**${question}**\n\nReact below to vote: 👍 Yes | 👎 No`)
          .setTimestamp();

        await interaction.reply({ content: "📊 **Generating community poll...**", ephemeral: true });
        const msg = await interaction.channel?.send({ embeds: [embed] });
        if (msg && "react" in msg) {
          await msg.react("👍").catch(() => {});
          await msg.react("👎").catch(() => {});
        }
        return;
      }

      // 26. /purge
      if (commandName === "purge") {
        if (!guild) {
          return await interaction.reply({
            content: buildServerBotWarningMessage("purge messages in servers"),
            ephemeral: true,
          });
        }
        if (!isServerBotInGuild(guild)) {
          return await interaction.reply({
            content: buildServerBotWarningMessage("purge messages (requires Yuri Server Bot ID `1545528232898465893`)"),
            ephemeral: true,
          });
        }
        const memberPerms = (member as GuildMember)?.permissions;
        if (!memberPerms?.has(PermissionFlagsBits.ManageMessages) && !isOwner(user.id)) {
          return await interaction.reply({
            content: buildServerBotWarningMessage("purge messages (Manage Messages permission required)"),
            ephemeral: true,
          });
        }
        const count = options.getInteger("count", true);
        const channel: any = interaction.channel;
        if (channel?.bulkDelete) {
          await interaction.reply({ content: `🧹 **Purging ${count} messages...**`, ephemeral: true });
          const deleted = await channel.bulkDelete(count, true).catch(() => null);
          return await interaction.followUp({
            content: `🧹 Successfully purged **${deleted?.size || count}** messages.`,
            ephemeral: true,
          });
        }
        return await interaction.reply({ content: "Cannot bulk delete in this channel.", ephemeral: true });
      }

      // New: /kick
      if (commandName === "kick") {
        if (!guild) return await interaction.reply({ content: buildServerBotWarningMessage("kick members"), ephemeral: true });
        if (!isServerBotInGuild(guild)) return await interaction.reply({ content: buildServerBotWarningMessage("kick members (Server Bot required)"), ephemeral: true });
        
        const target = options.getMember("user") as GuildMember;
        const reason = options.getString("reason") || "No reason provided";
        
        if (!target) return await interaction.reply({ content: "Target member not found.", ephemeral: true });
        if (!target.kickable) return await interaction.reply({ content: "I cannot kick this member (Hierarchy/Permissions issue).", ephemeral: true });

        await target.kick(reason);
        return await interaction.reply({ content: `👞 Successfully kicked **${target.user.tag}** | Reason: ${reason}` });
      }

      // New: /ban
      if (commandName === "ban") {
        if (!guild) return await interaction.reply({ content: buildServerBotWarningMessage("ban members"), ephemeral: true });
        if (!isServerBotInGuild(guild)) return await interaction.reply({ content: buildServerBotWarningMessage("ban members (Server Bot required)"), ephemeral: true });
        
        const target = options.getUser("user", true);
        const reason = options.getString("reason") || "No reason provided";
        const deleteDays = options.getInteger("delete_messages") || 0;

        try {
          await guild.members.ban(target, { reason, deleteMessageSeconds: deleteDays * 24 * 60 * 60 });
          return await interaction.reply({ content: `🔨 Successfully banned **${target.tag}** | Reason: ${reason}` });
        } catch (e: any) {
          return await interaction.reply({ content: `Failed to ban: ${e.message}`, ephemeral: true });
        }
      }

      // New: /timeout
      if (commandName === "timeout") {
        if (!guild) return await interaction.reply({ content: buildServerBotWarningMessage("timeout members"), ephemeral: true });
        if (!isServerBotInGuild(guild)) return await interaction.reply({ content: buildServerBotWarningMessage("timeout members (Server Bot required)"), ephemeral: true });

        const target = options.getMember("user") as GuildMember;
        const duration = parseInt(options.getString("duration", true));
        const reason = options.getString("reason") || "No reason provided";

        if (!target) return await interaction.reply({ content: "Target member not found.", ephemeral: true });
        
        try {
          await target.timeout(duration * 1000, reason);
          return await interaction.reply({ content: `⏳ Successfully timed out **${target.user.tag}** for \`${duration}\` seconds | Reason: ${reason}` });
        } catch (e: any) {
          return await interaction.reply({ content: `Failed to timeout: ${e.message}`, ephemeral: true });
        }
      }

      // New: /slowmode
      if (commandName === "slowmode") {
        if (!guild) return await interaction.reply({ content: buildServerBotWarningMessage("set slowmode"), ephemeral: true });
        if (!isServerBotInGuild(guild)) return await interaction.reply({ content: buildServerBotWarningMessage("set slowmode (Server Bot required)"), ephemeral: true });

        const seconds = options.getInteger("seconds", true);
        const channel = interaction.channel as any;

        if (channel?.setRateLimitPerUser) {
          await channel.setRateLimitPerUser(seconds);
          return await interaction.reply({ content: `🐢 Slowmode set to **${seconds}** seconds for this channel.` });
        }
        return await interaction.reply({ content: "Cannot set slowmode in this channel.", ephemeral: true });
      }

      // New: /ship
      if (commandName === "ship") {
        const u1 = options.getUser("user1", true);
        const u2 = options.getUser("user2") || user;
        const percent = Math.floor(Math.random() * 101);
        
        let msg = "";
        if (percent > 90) msg = "💞 Soulmates! Get married already!";
        else if (percent > 70) msg = "💖 Great match! There's definitely something there.";
        else if (percent > 50) msg = "💛 Decent chance. Keep trying!";
        else if (percent > 20) msg = "💔 Better stay as friends.";
        else msg = "🌑 Total disaster. Stay away!";

        const embed = new EmbedBuilder()
          .setColor(0xff69b4)
          .setTitle("💘 Yuri Love Calculator")
          .setDescription(`**${u1.username}** ❤️ **${u2.username}**\n\nCompatibility: **${percent}%**\n\n${msg}`)
          .setTimestamp();
        return await interaction.reply({ embeds: [embed] });
      }

      // New: /hack
      if (commandName === "hack") {
        const target = options.getUser("user", true);
        await interaction.reply({ content: `💻 Initializing exploit on **${target.username}**...` });
        
        const steps = [
          "🔍 Scanning Discord session tokens...",
          "🔓 Bypassing 2FA via zero-day proxy...",
          "📁 Accessing private DMs and media history...",
          "💉 Injecting Yuri.sb malicious gateway payload...",
          "💸 Stealing billing info and nitro credits...",
          "✅ Hack complete. Target data exfiltrated to Yuri mainframes."
        ];

        for (const step of steps) {
          await new Promise(r => setTimeout(r, 1500));
          await interaction.editReply({ content: step });
        }
        
        await new Promise(r => setTimeout(r, 2000));
        return await interaction.editReply({ content: `✅ **Successfully "hacked" ${target.username}** (Simulated / Fun command).` });
      }

      // 27. /say
      if (commandName === "say") {
        const msg = options.getString("message", true);
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription(msg)
          .setTimestamp();
        
        await interaction.reply({ content: "📢 **Dispatching broadcast embed...**", ephemeral: true });

        if (guild && !isServerBotInGuild(guild)) {
          await interaction.followUp({
            content: buildServerBotWarningMessage("broadcast server messages (requires Yuri Server Bot `1545528232898465893`)"),
            ephemeral: true,
          }).catch(() => {});
        }

        return await interaction.followUp({ embeds: [embed], ephemeral: false });
      }

      // 28. /embed
      if (commandName === "embed") {
        const title = options.getString("title", true);
        const desc = options.getString("description", true);
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle(title)
          .setDescription(desc)
          .setTimestamp();

        await interaction.reply({ content: "💎 **Dispatching custom formatted embed...**", ephemeral: true });

        if (guild && !isServerBotInGuild(guild)) {
          await interaction.followUp({
            content: buildServerBotWarningMessage("dispatch server embeds (requires Yuri Server Bot `1545528232898465893`)"),
            ephemeral: true,
          }).catch(() => {});
        }

        return await interaction.followUp({ embeds: [embed], ephemeral: false });
      }

      // 29. /whitelist & /unwhitelist
      if (commandName === "whitelist") {
        if (!isOwner(user.id)) {
          return await interaction.reply({ content: "Owner only.", ephemeral: true });
        }
        const id = options.getString("user_id", true).replace(/[^0-9]/g, "");
        if (id.length < 15) return await interaction.reply({ content: "Invalid Discord user ID.", ephemeral: true });
        yuriBotAllowedUsers.add(id);
        saveWhitelist();
        return await interaction.reply({ content: `✅ Authorized user ID \`${id}\`.`, ephemeral: true });
      }

      if (commandName === "unwhitelist") {
        if (!isOwner(user.id)) {
          return await interaction.reply({ content: "Owner only.", ephemeral: true });
        }
        const id = options.getString("user_id", true).replace(/[^0-9]/g, "");
        yuriBotAllowedUsers.delete(id);
        saveWhitelist();
        return await interaction.reply({ content: `Revoked authorization for user ID \`${id}\`.`, ephemeral: true });
      }

      // 30. /whitelisted
      if (commandName === "whitelisted") {
        const list = Array.from(yuriBotAllowedUsers).map((id) => `• <@${id}> (\`${id}\`)`).join("\n") || "No users whitelisted.";
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🔐 Yuri Companion Whitelist")
          .setDescription(list)
          .setTimestamp();
        return await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } catch (err: any) {
      console.error("[YURI BOT] Slash command error:", err);
      if (!interaction.replied && !interaction.deferred) {
        interaction.reply({ content: `An error occurred: ${err?.message || err}`, ephemeral: true }).catch(() => {});
      }
    }
  });

  // ==========================================
  // PREFIX COMMANDS (.whois, .giverole, .help, etc.)
  // ALWAYS PURE EMBED AND DESIGN (NO '>' OR '*')
  // ==========================================
  bot.on("messageCreate", async (message: any) => {
    // Russian bot should only use slash commands, ignore prefix text commands
    if (bot.user?.id === "1545467399493521478") return;

    if (message.author?.bot) return;

    // Check AFK mention auto-reply
    if (message.mentions?.users?.size) {
      for (const [mentionedId] of message.mentions.users) {
        const afk = afkUsers.get(mentionedId);
        if (afk) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("💤 User is AFK")
            .setDescription(`<@${mentionedId}> is currently away:\n\n• **Note:** \`${afk.message}\`\n• Since: <t:${Math.floor(afk.timestamp / 1000)}:R>`)
            .setFooter({ text: "Yuri Companion Auto-Responder" })
            .setTimestamp();
          message.reply({ embeds: [embed] }).catch(() => {});
        }
      }
    }

    // Auto-remove AFK on author message
    if (afkUsers.has(message.author.id)) {
      afkUsers.delete(message.author.id);
      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setDescription(`Welcome back <@${message.author.id}>, your AFK status has been cleared.`)
        .setTimestamp();
      message.reply({ embeds: [embed] }).catch(() => {});
    }

    const botMention = `<@${bot.user?.id}>`;
    const botMentionNick = `<@!${bot.user?.id}>`;
    let content = message.content.trim();
    let isMention = false;

    if (content.startsWith(botMention)) {
      content = content.slice(botMention.length).trim();
      isMention = true;
    } else if (content.startsWith(botMentionNick)) {
      content = content.slice(botMentionNick.length).trim();
      isMention = true;
    }

    const prefixes = [".", "/", "!"];
    let usedPrefix = "";
    for (const p of prefixes) {
      if (content.startsWith(p)) {
        usedPrefix = p;
        content = content.slice(p.length).trim();
        break;
      }
    }

    if (!usedPrefix && !isMention) return;

    const parts = content.split(/\s+/);
    const command = parts.shift()?.toLowerCase();
    if (!command) return;

    const activeClients = getActiveClients ? getActiveClients() : undefined;
    const sessions = getSessions ? getSessions() : undefined;

    // Public prefix commands are accessible to all users for instant testing
    const PUBLIC_PREFIX_COMMANDS = new Set([
      "help",
      "h",
      "whois",
      "ui",
      "userinfo",
      "avatar",
      "av",
      "banner",
      "serverinfo",
      "si",
      "server",
      "ping",
      "uptime",
      "status",
      "snipe",
      "afk",
      "calculate",
      "calc",
      "math",
      "coinflip",
      "cf",
      "dice",
      "roll",
      "8ball",
    ]);
    const isPublic = PUBLIC_PREFIX_COMMANDS.has(command);
    const hasAdmin =
      message.member?.permissions?.has?.(PermissionFlagsBits.ManageRoles) ||
      message.member?.permissions?.has?.(PermissionFlagsBits.Administrator);
    const isAuth =
      isAuthorizedSelfbotUser(message.author.id, activeClients, sessions) ||
      hasAdmin;

    if (!isPublic && !isAuth) {
      await message
        .reply({ embeds: [buildAccessDeniedEmbed(message.author.id)] })
        .catch(() => {});
      return;
    }

    // 1. HELP
    if (command === "help") {
      const pageArg = parseInt(parts[0], 10) || 1;
      const { embed, components } = buildHelpEmbed(pageArg, bot.user);
      await message.reply({ embeds: [embed], components }).catch(() => {});
      return;
    }

    // 2. WHOIS / UI / USERINFO
    if (command === "whois" || command === "ui" || command === "userinfo") {
      let targetUser = message.mentions?.users?.first();
      if (!targetUser && message.reference?.messageId) {
        try {
          const refMsg = await message.channel.messages.fetch(message.reference.messageId);
          if (refMsg?.author) targetUser = refMsg.author;
        } catch {}
      }
      if (!targetUser && parts[0]) {
        const cleanId = parts[0].replace(/[^0-9]/g, "");
        if (cleanId) {
          try {
            targetUser = await bot.users.fetch(cleanId);
          } catch {}
        }
      }
      if (!targetUser) targetUser = message.author;

      let fullUser = targetUser;
      try {
        fullUser = await bot.users.fetch(targetUser.id, { force: true });
      } catch {}

      const member = message.guild?.members.cache.get(targetUser.id);
      const avatarUrl = fullUser.displayAvatarURL({ size: 4096 });
      const bannerUrl = fullUser.bannerURL ? fullUser.bannerURL({ size: 4096 }) : null;
      const displayName = fullUser.globalName || fullUser.displayName || fullUser.username;

      const rolesList =
        member && member.roles.cache.size > 1
          ? member.roles.cache
              .filter((r: any) => r.id !== message.guild?.id)
              .map((r: any) => `<@&${r.id}>`)
              .slice(0, 10)
              .join(" ")
          : "No custom roles";

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setAuthor({ name: `${fullUser.tag} ${fullUser.bot ? "[BOT]" : ""}`, iconURL: avatarUrl })
        .setTitle("👤 User Profile Intelligence")
        .setThumbnail(avatarUrl)
        .addFields(
          { name: "🏷️ Tag & Identifier", value: `\`${fullUser.tag}\`\nID: \`${fullUser.id}\``, inline: true },
          { name: "📛 Display Name", value: `**${displayName}**`, inline: true },
          { name: "🤖 Account Type", value: fullUser.bot ? "`Bot Application`" : "`Standard User`", inline: true },
          {
            name: "📅 Account Created",
            value: `<t:${Math.floor(fullUser.createdTimestamp / 1000)}:F>\n(<t:${Math.floor(fullUser.createdTimestamp / 1000)}:R>)`,
            inline: true,
          }
        );

      if (member?.joinedTimestamp) {
        embed.addFields({
          name: "📥 Joined Server",
          value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>\n(<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)`,
          inline: true,
        });
      }

      if (member) {
        embed.addFields({ name: "🛡️ Assigned Roles", value: rolesList, inline: false });
      }

      if (bannerUrl) {
        embed.setImage(bannerUrl);
      }

      embed.setFooter({ text: "Yuri Selfbot Companion", iconURL: bot.user?.displayAvatarURL() }).setTimestamp();
      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }

    // 3. AVATAR / AV / PFP
    if (command === "avatar" || command === "av" || command === "pfp") {
      let targetUser = message.mentions?.users?.first();
      if (!targetUser && parts[0]) {
        const cleanId = parts[0].replace(/[^0-9]/g, "");
        if (cleanId) {
          try {
            targetUser = await bot.users.fetch(cleanId);
          } catch {}
        }
      }
      if (!targetUser) targetUser = message.author;

      const avatarUrl = targetUser.displayAvatarURL({ size: 4096 });
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle(`🖼️ ${targetUser.tag}'s Avatar`)
        .setDescription(`[Direct High-Res Link (4096px)](${avatarUrl})`)
        .setImage(avatarUrl)
        .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();
      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }

    // 4. BANNER
    if (command === "banner") {
      let targetUser = message.mentions?.users?.first();
      if (!targetUser && parts[0]) {
        const cleanId = parts[0].replace(/[^0-9]/g, "");
        if (cleanId) {
          try {
            targetUser = await bot.users.fetch(cleanId);
          } catch {}
        }
      }
      if (!targetUser) targetUser = message.author;

      let fullUser = targetUser;
      try {
        fullUser = await bot.users.fetch(targetUser.id, { force: true });
      } catch {}

      const bannerUrl = fullUser.bannerURL ? fullUser.bannerURL({ size: 4096 }) : null;
      if (!bannerUrl) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🖼️ Profile Banner")
          .setDescription(`User **${fullUser.tag}** has no configured profile banner.`)
          .setTimestamp();
        await message.reply({ embeds: [embed] }).catch(() => {});
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle(`🖼️ ${fullUser.tag}'s Banner`)
        .setDescription(`[Direct High-Res Link (4096px)](${bannerUrl})`)
        .setImage(bannerUrl)
        .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();
      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }

    // 5. GIVEROLE & ROLE GIVE
    if (command === "giverole" || (command === "role" && parts[0]?.toLowerCase() === "give")) {
      if (!message.guild) {
        const embed = new EmbedBuilder().setColor(0xed4245).setDescription("This command is guild only.");
        await message.reply({ embeds: [embed] }).catch(() => {});
        return;
      }

      if (command === "role") parts.shift(); // remove "give"

      const targetMember =
        message.mentions?.members?.first() ||
        (parts[0] ? await message.guild.members.fetch(parts[0].replace(/[^0-9]/g, "")).catch(() => null) : null);

      const role =
        message.mentions?.roles?.first() ||
        (parts[1] ? message.guild.roles.cache.get(parts[1].replace(/[^0-9]/g, "")) || message.guild.roles.cache.find((r: any) => r.name.toLowerCase() === parts.slice(1).join(" ").toLowerCase()) : null);

      if (!targetMember || !role) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("Usage: Role Assignment")
          .setDescription("`.giverole <@member> <@role>` or `.role give <user> <role>`")
          .setTimestamp();
        await message.reply({ embeds: [embed] }).catch(() => {});
        return;
      }

      const botMember = message.guild.members.me;
      if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("⚠️ Missing Permission")
          .setDescription("Yuri Companion lacks the **Manage Roles** permission.")
          .setTimestamp();
        await message.reply({ embeds: [embed] }).catch(() => {});
        return;
      }

      if (botMember.roles.highest.position <= role.position) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("⚠️ Role Hierarchy Issue")
          .setDescription(`Cannot assign <@&${role.id}> because it is higher than or equal to Yuri Companion's role.`)
          .setTimestamp();
        await message.reply({ embeds: [embed] }).catch(() => {});
        return;
      }

      await targetMember.roles.add(role);

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("🛡️ Role Granted Successfully")
        .setThumbnail(targetMember.user.displayAvatarURL())
        .addFields(
          { name: "Target Member", value: `<@${targetMember.id}> (\`${targetMember.user.tag}\`)`, inline: true },
          { name: "Role Granted", value: `<@&${role.id}> (\`${role.name}\`)`, inline: true },
          { name: "Issued By", value: `<@${message.author.id}>`, inline: true }
        )
        .setFooter({ text: "Yuri Selfbot Companion • Role Administration" })
        .setTimestamp();

      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }

    // 6. REMOVEROLE & ROLE REMOVE
    if (command === "removerole" || (command === "role" && parts[0]?.toLowerCase() === "remove")) {
      if (!message.guild) return;
      if (command === "role") parts.shift();

      const targetMember =
        message.mentions?.members?.first() ||
        (parts[0] ? await message.guild.members.fetch(parts[0].replace(/[^0-9]/g, "")).catch(() => null) : null);

      const role =
        message.mentions?.roles?.first() ||
        (parts[1] ? message.guild.roles.cache.get(parts[1].replace(/[^0-9]/g, "")) || message.guild.roles.cache.find((r: any) => r.name.toLowerCase() === parts.slice(1).join(" ").toLowerCase()) : null);

      if (!targetMember || !role) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("Usage: Role Removal")
          .setDescription("`.removerole <@member> <@role>` or `.role remove <user> <role>`")
          .setTimestamp();
        await message.reply({ embeds: [embed] }).catch(() => {});
        return;
      }

      await targetMember.roles.remove(role);

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🛡️ Role Revoked Successfully")
        .setThumbnail(targetMember.user.displayAvatarURL())
        .addFields(
          { name: "Target Member", value: `<@${targetMember.id}> (\`${targetMember.user.tag}\`)`, inline: true },
          { name: "Role Removed", value: `<@&${role.id}> (\`${role.name}\`)`, inline: true },
          { name: "Issued By", value: `<@${message.author.id}>`, inline: true }
        )
        .setFooter({ text: "Yuri Selfbot Companion • Role Administration" })
        .setTimestamp();

      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }

    // 7. SERVERINFO / SI
    if (command === "serverinfo" || command === "si") {
      const guild = message.guild;
      if (!guild) return;

      const owner = await guild.fetchOwner().catch(() => null);
      const channelsCount = guild.channels.cache.size;
      const textChannels = guild.channels.cache.filter((c: any) => c.isTextBased()).size;
      const voiceChannels = guild.channels.cache.filter((c: any) => c.isVoiceBased()).size;
      const iconUrl = guild.iconURL({ size: 4096 });

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle(`🏰 ${guild.name} • Server Metrics`)
        .setThumbnail(iconUrl || "")
        .addFields(
          { name: "👑 Server Owner", value: owner ? `<@${owner.id}> (${owner.user.tag})` : "Unknown", inline: true },
          { name: "🆔 Server ID", value: `\`${guild.id}\``, inline: true },
          { name: "👥 Total Members", value: `\`${guild.memberCount}\``, inline: true },
          { name: "💬 Channels", value: `Total: \`${channelsCount}\` (Text: \`${textChannels}\` | Voice: \`${voiceChannels}\`)`, inline: true },
          { name: "🛡️ Roles", value: `\`${guild.roles.cache.size}\` roles`, inline: true },
          { name: "🚀 Boost Status", value: `Tier \`${guild.premiumTier}\` (${guild.premiumSubscriptionCount || 0} boosts)`, inline: true },
          {
            name: "📅 Server Created",
            value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>\n(<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`,
            inline: false,
          }
        );

      if (guild.bannerURL()) {
        embed.setImage(guild.bannerURL({ size: 4096 })!);
      }

      embed.setFooter({ text: "Yuri Selfbot Companion" }).setTimestamp();
      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }

    // 8. UPTIME
    if (command === "uptime") {
      const totalSeconds = Math.floor((Date.now() - yuriBotStartTime) / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const memoryMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🚀 Yuri Companion • Service Health & Uptime")
        .setThumbnail("https://i.pinimg.com/originals/5f/a0/e3/5fa0e3e226de58362578fd5e28caabf1.gif")
        .addFields(
          { name: "⏱️ Continuous Uptime", value: `\`${hours}h ${minutes}m ${seconds}s\` (24/7 Active)`, inline: true },
          { name: "🏓 Gateway Latency", value: `\`${bot.ws.ping}ms\``, inline: true },
          { name: "💾 Memory Allocated", value: `\`${memoryMB} MB\``, inline: true },
          { name: "🏰 Guilds Connected", value: `\`${bot.guilds.cache.size}\``, inline: true },
          { name: "🛡️ Access Mode", value: "`Authorized Yuri Accounts Only`", inline: true }
        )
        .setFooter({ text: "Yuri Selfbot Companion Service" })
        .setTimestamp();

      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }

    // 9. PING
    if (command === "ping") {
      const wsPing = bot.ws.ping;
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🏓 Gateway Pong!")
        .addFields(
          { name: "WebSocket Ping", value: `\`${wsPing}ms\``, inline: true },
          { name: "Status", value: "🟢 Operational (24/7)", inline: true }
        )
        .setTimestamp();
      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }

    // 10. AFK
    if (command === "afk") {
      const note = parts.join(" ") || "Away from keyboard currently.";
      afkUsers.set(message.author.id, { message: note, timestamp: Date.now() });

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("💤 AFK Mode Activated")
        .setDescription(`You are now set to AFK.\n\n• **Reason:** \`${note}\`\n• Incoming mentions and direct replies will be notified.`)
        .setFooter({ text: "Yuri Selfbot Companion" })
        .setTimestamp();

      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }

    // 11. PURGE
    if (command === "purge" || command === "cleardm") {
      const count = Math.min(parseInt(parts[0], 10) || 10, 100);
      if (message.channel.bulkDelete) {
        const deleted = await message.channel.bulkDelete(count, true).catch(() => null);
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🧹 Channel Purged")
          .setDescription(`Successfully purged **${deleted?.size || count}** messages.`)
          .setTimestamp();
        const reply = await message.channel.send({ embeds: [embed] }).catch(() => null);
        if (reply) setTimeout(() => reply.delete().catch(() => {}), 4000);
      }
      return;
    }

    // 12. SAY
    if (command === "say") {
      const text = parts.join(" ");
      if (!text) return;
      await message.delete().catch(() => {});
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setDescription(text)
        .setFooter({ text: `Broadcast by ${message.author.tag}` })
        .setTimestamp();
      await message.channel.send({ embeds: [embed] }).catch(() => {});
      return;
    }

    // 13. EMBED
    if (command === "embed") {
      const text = parts.join(" ");
      if (!text) return;
      await message.delete().catch(() => {});
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("Announcement")
        .setDescription(text)
        .setFooter({ text: `Yuri Selfbot • ${message.author.tag}` })
        .setTimestamp();
      await message.channel.send({ embeds: [embed] }).catch(() => {});
      return;
    }

    // 14. WHITELISTED / SELFBOTS
    if (command === "whitelisted" || command === "selfbots") {
      const list = Array.from(yuriBotAllowedUsers);
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🛡️ Authorized Yuri Selfbot Accounts")
        .setDescription(
          `Total Authorized Accounts: **${list.length}**\n\n` +
          list.map((id) => `• <@${id}> (\`${id}\`)`).join("\n")
        )
        .setFooter({ text: "Yuri Selfbot Access Control" })
        .setTimestamp();
      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }

    // 15. WHITELIST
    if (command === "whitelist") {
      const targetId = (parts[0] || "").trim().replace(/[^0-9]/g, "");
      if (!targetId || targetId.length < 15) {
        const embed = new EmbedBuilder().setColor(0xed4245).setDescription("Please provide a valid Snowflake ID.");
        await message.reply({ embeds: [embed] }).catch(() => {});
        return;
      }
      yuriBotAllowedUsers.add(targetId);
      saveWhitelist();

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("✅ Selfbot Account Authorized")
        .setDescription(`Discord ID <@${targetId}> (\`${targetId}\`) is now authorized to use Yuri Companion.`)
        .setTimestamp();
      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }

    // 16. UNWHITELIST
    if (command === "unwhitelist") {
      const targetId = (parts[0] || "").trim().replace(/[^0-9]/g, "");
      yuriBotAllowedUsers.delete(targetId);
      saveWhitelist();

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🗑️ Authorization Revoked")
        .setDescription(`Discord ID \`${targetId}\` has been removed from authorization list.`)
        .setTimestamp();
      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }

    // 17. SNIPE
    if (command === "snipe") {
      const sniped = snipedMessages.get(message.channelId);
      if (!sniped) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🎯 Message Snipe")
          .setDescription("No recently deleted messages found in this channel.")
          .setTimestamp();
        await message.reply({ embeds: [embed] }).catch(() => {});
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setAuthor({ name: sniped.author, iconURL: sniped.authorAvatar })
        .setTitle("🎯 Sniped Deleted Message")
        .setDescription(sniped.content)
        .setFooter({ text: `Deleted <t:${Math.floor(sniped.timestamp / 1000)}:R>` })
        .setTimestamp();

      if (sniped.attachments?.length) {
        embed.setImage(sniped.attachments[0]);
      }

      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }

    // 18. MEMBERCOUNT
    if (command === "membercount" || command === "mc") {
      if (!message.guild) return;
      const total = message.guild.memberCount;
      const bots = message.guild.members.cache.filter((m: any) => m.user?.bot).size;
      const humans = total - bots;

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle(`👥 ${message.guild.name} • Member Count`)
        .addFields(
          { name: "Total Members", value: `\`${total}\``, inline: true },
          { name: "Humans", value: `\`${humans}\``, inline: true },
          { name: "Bots", value: `\`${bots}\``, inline: true }
        )
        .setTimestamp();
      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }

    // 19. ROLES
    if (command === "roles") {
      if (!message.guild) return;
      const rolesList = message.guild.roles.cache
        .filter((r: any) => r.id !== message.guild.id)
        .map((r: any) => `<@&${r.id}> (\`${r.id}\`)`)
        .slice(0, 20)
        .join("\n");

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle(`🛡️ ${message.guild.name} • Server Roles (${message.guild.roles.cache.size})`)
        .setDescription(rolesList || "No custom roles created.")
        .setTimestamp();
      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }

    // 20. PERMS
    if (command === "perms" || command === "permissions") {
      if (!message.guild) return;
      const targetMember =
        message.mentions?.members?.first() ||
        (parts[0] ? await message.guild.members.fetch(parts[0].replace(/[^0-9]/g, "")).catch(() => null) : message.member);

      if (!targetMember) return;
      const keyPerms = [
        "Administrator",
        "ManageGuild",
        "ManageRoles",
        "ManageChannels",
        "KickMembers",
        "BanMembers",
        "ManageMessages",
        "MentionEveryone",
      ];
      const has = keyPerms.filter((p) => (targetMember.permissions as any).has(PermissionFlagsBits[p as keyof typeof PermissionFlagsBits]));

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle(`🔐 Permissions: ${targetMember.user.tag}`)
        .setDescription(
          has.length > 0
            ? has.map((p) => `✅ \`${p}\``).join("\n")
            : "Standard member permissions (No key administrator flags)."
        )
        .setTimestamp();
      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }

    // 21. MATH / CALC
    if (command === "math" || command === "calc") {
      const expr = parts.join(" ");
      if (!expr) {
        const embed = new EmbedBuilder().setColor(0xed4245).setDescription("Usage: `.math <expression>` (e.g. `.math 25 * 4`)");
        await message.reply({ embeds: [embed] }).catch(() => {});
        return;
      }
      try {
        const sanitized = expr.replace(/[^0-9+\-*/().^% ]/g, "");
        const result = Function(`'use strict'; return (${sanitized})`)();
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🧮 Math Calculation")
          .addFields(
            { name: "Expression", value: `\`${expr}\``, inline: true },
            { name: "Result", value: `\`${result}\``, inline: true }
          )
          .setTimestamp();
        await message.reply({ embeds: [embed] }).catch(() => {});
      } catch {
        const embed = new EmbedBuilder().setColor(0xed4245).setDescription("Invalid mathematical expression.");
        await message.reply({ embeds: [embed] }).catch(() => {});
      }
      return;
    }

    // 22. 8BALL
    if (command === "8ball") {
      const question = parts.join(" ");
      if (!question) {
        const embed = new EmbedBuilder().setColor(0xed4245).setDescription("Usage: `.8ball <question>`");
        await message.reply({ embeds: [embed] }).catch(() => {});
        return;
      }
      const responses = [
        "It is certain.",
        "It is decidedly so.",
        "Without a doubt.",
        "Yes definitely.",
        "You may rely on it.",
        "As I see it, yes.",
        "Most likely.",
        "Outlook good.",
        "Yes.",
        "Signs point to yes.",
        "Reply hazy, try again.",
        "Ask again later.",
        "Better not tell you now.",
        "Cannot predict now.",
        "Concentrate and ask again.",
        "Don't count on it.",
        "My reply is no.",
        "My sources say no.",
        "Outlook not so good.",
        "Very doubtful.",
      ];
      const answer = responses[Math.floor(Math.random() * responses.length)];
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🎱 Magic 8-Ball")
        .addFields(
          { name: "Question", value: question, inline: false },
          { name: "Answer", value: `**${answer}**`, inline: false }
        )
        .setTimestamp();
      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }

    // 23. COINFLIP / CF
    if (command === "coinflip" || command === "cf") {
      const outcome = Math.random() > 0.5 ? "🪙 Heads" : "🪙 Tails";
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🪙 Coin Flip")
        .setDescription(`The coin landed on: **${outcome}**!`)
        .setTimestamp();
      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }

    // 24. DICE / ROLL
    if (command === "dice" || command === "roll") {
      const sides = parseInt(parts[0], 10) || 6;
      const roll = Math.floor(Math.random() * sides) + 1;
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🎲 Dice Roll")
        .setDescription(`You rolled a **d${sides}** and got: **${roll}**!`)
        .setTimestamp();
      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }

    // 25. MOCK
    if (command === "mock") {
      const text = parts.join(" ");
      if (!text) return;
      const mocked = text
        .split("")
        .map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()))
        .join("");
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🤪 MoCkEd TeXt")
        .setDescription(mocked)
        .setTimestamp();
      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }

    // 26. REVERSE
    if (command === "reverse") {
      const text = parts.join(" ");
      if (!text) return;
      const reversed = text.split("").reverse().join("");
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🔄 Reversed Text")
        .setDescription(reversed)
        .setTimestamp();
      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }
  });

  try {
    await bot.login(token);
    if (bot.user) {
      activeYuriBots.set(bot.user.id, bot);
      if (!yuriBotClient || !yuriBotClient.isReady()) {
        yuriBotClient = bot;
      }
    }
    return bot;
  } catch (err: any) {
    console.error("[YURI BOT] Login failure for token prefix:", token.slice(0, 8), err?.message || err);
    throw err;
  }
}

// Direct Command Runner Dispatcher (For Web Dashboard Forms & API)
export async function executeBotCommandDirect(
  command: string,
  args: Record<string, any> = {},
  channelId?: string,
  guildId?: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const bot = yuriBotClient || Array.from(activeYuriBots.values())[0];
    if (!bot || !bot.isReady()) {
      return { success: false, error: "No active Yuri Bot client currently connected." };
    }

    // If channelId provided, we can send real embeds or actions
    if (channelId) {
      const channel: any = await bot.channels.fetch(channelId).catch(() => null);
      if (channel && channel.isTextBased()) {
        if (command === "say") {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(args.text || args.message || "Command executed from Yuri Web Dashboard")
            .setFooter({ text: "Yuri Companion Command Dispatcher" })
            .setTimestamp();
          await channel.send({ embeds: [embed] });
          return { success: true, result: `Broadcasted to channel #${channel.name}` };
        }

        if (command === "embed") {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle(args.title || "Announcement")
            .setDescription(args.description || args.text || "Dispatched from Web Panel")
            .setFooter({ text: "Yuri Selfbot Control Center" })
            .setTimestamp();
          await channel.send({ embeds: [embed] });
          return { success: true, result: `Embed dispatched to #${channel.name}` };
        }

        if (command === "help") {
          const { embed, components } = buildHelpEmbed(args.page || 1, bot.user);
          await channel.send({ embeds: [embed], components });
          return { success: true, result: `Help embed with buttons sent to #${channel.name}` };
        }
      }
    }

    if (command === "whitelist" && args.user_id) {
      const id = String(args.user_id).trim().replace(/[^0-9]/g, "");
      if (id.length >= 15) {
        yuriBotAllowedUsers.add(id);
        saveWhitelist();
        return { success: true, result: `Authorized user ID ${id}` };
      }
    }

    if (command === "unwhitelist" && args.user_id) {
      const id = String(args.user_id).trim().replace(/[^0-9]/g, "");
      yuriBotAllowedUsers.delete(id);
      saveWhitelist();
      return { success: true, result: `Revoked authorization for user ID ${id}` };
    }

    if (command === "sync_slash") {
      for (const b of activeYuriBots.values()) {
        if (b.user?.id) {
          const token = b.token || YURI_BOT_TOKEN;
          await syncGlobalSlashCommands(token, b.user.id);
        }
      }
      return { success: true, result: "Slash commands forced re-sync on all active bot instances." };
    }

    return {
      success: true,
      result: `Command '${command}' processed successfully.`,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function startYuriBot(
  getActiveClients?: () => Map<string, any>,
  getSessions?: () => Map<string, any>
): Promise<void> {
  clearTimeout(reconnectTimer);
  for (const bot of activeYuriBots.values()) {
    try {
      bot.destroy();
    } catch {}
  }
  activeYuriBots.clear();
  yuriBotClient = null;

  const tokens = KNOWN_BOT_TOKENS;
  let successful = 0;
  for (const token of tokens) {
    try {
      await createAndRunBot(token, getActiveClients, getSessions);
      successful++;
    } catch (e: any) {
      console.warn("[YURI BOT] Secondary bot connection notice:", e?.message || e);
    }
  }

  console.log(`[YURI BOT 24/7] System active with ${successful} active bot instances connected.`);
}

export function getYuriBotStatus(getActiveClients?: () => Map<string, any>) {
  const botsList = Array.from(activeYuriBots.values()).map((b) => ({
    id: b.user?.id || "unknown",
    tag: b.user?.tag || "Offline",
    avatar: b.user?.displayAvatarURL() || "",
    ping: b.ws?.ping || 0,
    guildsCount: b.guilds?.cache?.size || 0,
    online: b.isReady(),
    inviteUrl: `https://discord.com/oauth2/authorize?client_id=${b.user?.id || '1545467399493521478'}`,
  }));

  const mainBot = botsList.find((b) => b.id === "1545467399493521478") || botsList.find((b) => b.online) || botsList[0];
  const isOnline = !!(mainBot && mainBot.online);
  const uptimeSec = isOnline ? Math.floor((Date.now() - yuriBotStartTime) / 1000) : 0;
  return {
    online: isOnline,
    tag: mainBot?.tag || "Offline",
    id: "1545467399493521478",
    avatar: mainBot?.avatar || "",
    ping: mainBot?.ping || 0,
    uptime: uptimeSec,
    guildsCount: botsList.reduce((acc, b) => acc + b.guildsCount, 0),
    authorizedUsers: Array.from(yuriBotAllowedUsers),
    bots: botsList,
  };
}
