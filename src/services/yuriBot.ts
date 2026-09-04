import {
  Client as DiscordBotClient,
  GatewayIntentBits,
  Partials,
  ActivityType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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

export const YURI_BOT_TOKEN = process.env.YURI_BOT_TOKEN || process.env.DISCORD_BOT_TOKEN || "";

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

// Full Discord Application (Slash) Commands Definition (All SB + Bot Tools)
export const YURI_SLASH_COMMANDS = [
  {
    name: "whois",
    description: "Inspect detailed profile, snowflake ID, tenure, and roles of a user",
    options: [
      {
        name: "user",
        description: "Target user to inspect (mention or ID)",
        type: ApplicationCommandOptionType.User,
        required: false,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "avatar",
    description: "Extract high-resolution 4096px direct avatar link and artwork",
    options: [
      {
        name: "user",
        description: "Target user to view avatar for",
        type: ApplicationCommandOptionType.User,
        required: false,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "banner",
    description: "Extract high-resolution profile banner link and artwork",
    options: [
      {
        name: "user",
        description: "Target user to view banner for",
        type: ApplicationCommandOptionType.User,
        required: false,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "giverole",
    description: "Assign a guild role to a server member",
    options: [
      {
        name: "member",
        description: "The member to grant the role to",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "role",
        description: "The role to assign",
        type: ApplicationCommandOptionType.Role,
        required: true,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "removerole",
    description: "Remove an existing role from a server member",
    options: [
      {
        name: "member",
        description: "The member to remove the role from",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "role",
        description: "The role to remove",
        type: ApplicationCommandOptionType.Role,
        required: true,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "serverinfo",
    description: "Display comprehensive guild metrics, boost tier, and member statistics",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "membercount",
    description: "Display live server member, human, and bot breakdown",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "roles",
    description: "List all server roles and their Snowflake IDs",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "perms",
    description: "Inspect user or channel permission bitfields",
    options: [
      {
        name: "user",
        description: "Target user to inspect permissions for",
        type: ApplicationCommandOptionType.User,
        required: false,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "uptime",
    description: "Check Yuri 24/7 background companion uptime & health",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "ping",
    description: "Check Gateway WebSocket latency & REST roundtrip",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "afk",
    description: "Set smart AFK status with automatic response trigger",
    options: [
      {
        name: "message",
        description: "Custom away message",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "purge",
    description: "Purge recent messages in the current channel",
    options: [
      {
        name: "count",
        description: "Number of messages to clear (1-100)",
        type: ApplicationCommandOptionType.Integer,
        required: true,
        minValue: 1,
        maxValue: 100,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "form",
    description: "Open an interactive Discord Modal Form where you can put anything to send.",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "say",
    description: "Send a message as the bot.",
    options: [
      {
        name: "message",
        description: "Message to send",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "embed",
    description: "Send an embed.",
    options: [
      {
        name: "message",
        description: "Message to put in the embed",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "whitelist",
    description: "Whitelist a user.",
    options: [
      {
        name: "user",
        description: "User to whitelist",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "unwhitelist",
    description: "Remove a user from the whitelist.",
    options: [
      {
        name: "user",
        description: "User to remove",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "whitelisted",
    description: "List whitelisted users.",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "snipe",
    description: "Retrieve recently deleted message in this channel",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "math",
    description: "Perform quick mathematical calculation",
    options: [
      {
        name: "expression",
        description: "Math expression (e.g. 24 * 7 + 100)",
        type: ApplicationCommandOptionType.String,
        required: true,
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
        description: "Your question",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
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
    description: "Roll a dice",
    options: [
      {
        name: "sides",
        description: "Number of sides (default: 6)",
        type: ApplicationCommandOptionType.Integer,
        required: false,
      },
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: "mock",
    description: "Convert text to MoCkInG format",
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
    description: "Reverse input text string",
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
        raw.options = cmd.options.map((opt: any) => ({
          name: opt.name,
          description: opt.description,
          type: opt.type,
          required: opt.required ?? false,
          min_value: opt.minValue,
          max_value: opt.maxValue,
        }));
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
      "This service is exclusively reserved for authenticated **Yuri Selfbot** accounts.\n\n" +
      `• **User ID:** \`${userId}\`\n` +
      `• **Status:** Not Verified on Yuri Network\n\n` +
      "Log into the Yuri Web Dashboard or add your Discord User ID to the authorization whitelist to activate full companion controls."
    )
    .setThumbnail("https://i.pinimg.com/originals/5f/a0/e3/5fa0e3e226de58362578fd5e28caabf1.gif")
    .setFooter({ text: "Yuri Selfbot Security Protocol" })
    .setTimestamp();
}

// Helper: Build pure Help Embed with interactive pagination buttons
function buildHelpEmbed(page: number, botUser: any): { embed: EmbedBuilder; components: any[] } {
  const p = page === 2 || page === 3 ? page : 1;
  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("⚡ Yuri Selfbot Companion • Operations Directory")
    .setFooter({
      text: `Yuri Companion Service • Page ${p} of 3 • Slash & Prefix Supported`,
      iconURL: botUser?.displayAvatarURL(),
    })
    .setTimestamp();

  if (p === 1) {
    embed
      .setDescription(
        "Dedicated companion service operating 24/7 with pure embed responses, interactive buttons, and verified user access control."
      )
      .addFields(
        {
          name: "👤 User & Profile Intelligence",
          value: [
            "`/whois [user]` or `.whois [user]` — Detailed profile, Snowflake ID, creation date & join tenure",
            "`/avatar [user]` or `.avatar [user]` — High-res 4096px direct avatar link with artwork embed",
            "`/banner [user]` or `.banner [user]` — High-resolution profile banner image extractor",
            "`.id [user]` — Direct Discord Snowflake ID extraction",
            "`.createdat [user]` — Exact account registration timestamp & relative days",
            "`.joinedat [user]` — Server join timestamp & relative tenure",
          ].join("\n"),
        },
        {
          name: "🎭 Identity & Roles",
          value: [
            "`/giverole <member> <role>` or `.giverole` — Grant server role with permission validation",
            "`/removerole <member> <role>` or `.removerole` — Revoke server role",
            "`/roles` or `.roles` — List assigned server roles and IDs",
            "`/perms [user]` or `.perms` — Inspect channel and guild permission bitfields",
          ].join("\n"),
        }
      )
      .setImage("https://i.pinimg.com/originals/5f/a0/e3/5fa0e3e226de58362578fd5e28caabf1.gif");
  } else if (p === 2) {
    embed
      .setDescription(
        "Server management, role allocation, and channel moderation capabilities."
      )
      .addFields(
        {
          name: "🏰 Guild & Server Intelligence",
          value: [
            "`/serverinfo` or `.serverinfo` — Guild stats, owner ID, members (online/bots), boost level & channels",
            "`/membercount` or `.membercount` — Human vs Bot member count breakdown",
            "`/purge <count>` or `.purge <count>` — Bulk clear messages in current text channel",
            "`/snipe` or `.snipe` — Recover the most recently deleted message in channel",
          ].join("\n"),
        },
        {
          name: "🛡️ Role Administration",
          value: [
            "`/giverole <member> <role>` — Assign any manageable role to a server member",
            "`/removerole <member> <role>` — Revoke a role from a member",
            "`.role give <user> <role>` — Prefix shorthand for role assignment",
            "`.role remove <user> <role>` — Prefix shorthand for role revocation",
          ].join("\n"),
        }
      )
      .setImage("https://i.pinimg.com/originals/5f/a0/e3/5fa0e3e226de58362578fd5e28caabf1.gif");
  } else {
    embed
      .setDescription(
        "Utilities, automation scripts, and Yuri Companion access controls."
      )
      .addFields(
        {
          name: "⚡ Core Diagnostics & Presence",
          value: [
            "`/uptime` or `.uptime` — Service continuous runtime and host health",
            "`/ping` or `.ping` — Real-time Gateway WebSocket latency & REST response",
            "`/afk [message]` or `.afk [message]` — Smart AFK status with automatic reply trigger",
            "`/say <text>` or `.say <text>` — Broadcast message via Yuri Companion",
            "`/embed <desc> [title]` or `.embed` — Broadcast formatted crimson embed",
          ].join("\n"),
        },
        {
          name: "🎲 Fun & Utility Tools",
          value: [
            "`/math <expression>` or `.math` — Instant mathematical calculation",
            "`/8ball <question>` or `.8ball` — Magic 8-ball prophetic answer",
            "`/coinflip` or `.coinflip` — Flip a coin (Heads/Tails)",
            "`/dice [sides]` or `.dice` — Roll polyhedral dice",
            "`/mock <text>` or `.mock` — MoCkInG text converter",
            "`/reverse <text>` or `.reverse` — Invert text string",
          ].join("\n"),
        },
        {
          name: "🔐 Authorized Selfbot Accounts",
          value: [
            "`/whitelisted` or `.whitelisted` — View authorized selfbot accounts",
            "`/whitelist <id>` or `.whitelist <id>` — Add authorized selfbot user ID",
            "`/unwhitelist <id>` or `.unwhitelist <id>` — Remove authorized selfbot user ID",
          ].join("\n"),
        }
      )
      .setImage("https://i.pinimg.com/originals/5f/a0/e3/5fa0e3e226de58362578fd5e28caabf1.gif");
  }

  // Interactive ActionRow with Pagination Buttons
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("yuri_help_1")
      .setLabel("👤 Profile & Roles")
      .setStyle(p === 1 ? ButtonStyle.Danger : ButtonStyle.Secondary)
      .setDisabled(p === 1),
    new ButtonBuilder()
      .setCustomId("yuri_help_2")
      .setLabel("🏰 Guild & Admin")
      .setStyle(p === 2 ? ButtonStyle.Danger : ButtonStyle.Secondary)
      .setDisabled(p === 2),
    new ButtonBuilder()
      .setCustomId("yuri_help_3")
      .setLabel("⚡ Tools & Whitelist")
      .setStyle(p === 3 ? ButtonStyle.Danger : ButtonStyle.Secondary)
      .setDisabled(p === 3)
  );

  return { embed, components: [row] };
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
  // DISCORD APPLICATION (SLASH) COMMANDS, MODALS & BUTTONS
  // ==========================================
  bot.on("interactionCreate", async (interaction: any) => {
    const activeClients = getActiveClients ? getActiveClients() : undefined;
    const sessions = getSessions ? getSessions() : undefined;

    // Handle Discord UI Modal Form Submissions
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
            const embed = new EmbedBuilder()
              .setColor(0xed4245)
              .setDescription(message);
            if (title) embed.setTitle(title);
            return await interaction.followUp({ embeds: [embed] });
          } else {
            return await interaction.followUp(message);
          }
        }
      } catch (err: any) {
        console.error("[YURI BOT] Modal submit error:", err);
      }
      return;
    }

    // Handle Interactive Button Pagination
    if (interaction.isButton()) {
      try {
        const customId = interaction.customId;
        let page = 1;
        if (customId === "yuri_help_1") page = 1;
        else if (customId === "yuri_help_2") page = 2;
        else if (customId === "yuri_help_3") page = 3;

        const { embed, components } = buildHelpEmbed(page, bot.user);
        return await interaction.update({ embeds: [embed], components });
      } catch (err: any) {
        console.error("[YURI BOT] Button update error:", err);
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, user, guild, member } = interaction as ChatInputCommandInteraction;

    // Public commands are accessible to all users for instant testing
    const PUBLIC_COMMANDS = new Set([
      "whois",
      "avatar",
      "banner",
      "serverinfo",
      "membercount",
      "roles",
      "perms",
      "ping",
      "uptime",
      "snipe",
      "afk",
      "math",
      "8ball",
      "coinflip",
      "dice",
      "mock",
      "reverse",
    ]);
    const isPublic = PUBLIC_COMMANDS.has(commandName);
    const hasAdmin =
      (member as any)?.permissions?.has?.(PermissionFlagsBits.ManageRoles) ||
      (member as any)?.permissions?.has?.(PermissionFlagsBits.Administrator);
    const isAuth =
      isAuthorizedSelfbotUser(user.id, activeClients, sessions) || hasAdmin;

    // Strict Access Control for privileged commands only
    if (!isPublic && !isAuth) {
      return interaction.reply({
        embeds: [buildAccessDeniedEmbed(user.id)],
        ephemeral: true,
      });
    }

    try {
      // 2. /whois
      if (commandName === "whois") {
        const targetUser = options.getUser("user") || user;
        let fullUser = targetUser;
        try {
          fullUser = await bot.users.fetch(targetUser.id, { force: true });
        } catch {}

        const targetMember = guild?.members.cache.get(targetUser.id);
        const avatarUrl = fullUser.displayAvatarURL({ size: 4096 });
        const bannerUrl = fullUser.bannerURL ? fullUser.bannerURL({ size: 4096 }) : null;
        const displayName = fullUser.globalName || fullUser.displayName || fullUser.username;

        const rolesList =
          targetMember && targetMember.roles.cache.size > 1
            ? targetMember.roles.cache
                .filter((r) => r.id !== guild?.id)
                .map((r) => `<@&${r.id}>`)
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

        if (targetMember?.joinedTimestamp) {
          embed.addFields({
            name: "📥 Joined Server",
            value: `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:F>\n(<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>)`,
            inline: true,
          });
        }

        if (targetMember) {
          embed.addFields({ name: "🛡️ Assigned Roles", value: rolesList, inline: false });
        }

        if (bannerUrl) {
          embed.setImage(bannerUrl);
        }

        embed.setFooter({ text: "Yuri Selfbot Companion", iconURL: bot.user?.displayAvatarURL() }).setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      // 3. /avatar
      if (commandName === "avatar") {
        const targetUser = options.getUser("user") || user;
        const avatarUrl = targetUser.displayAvatarURL({ size: 4096 });
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle(`🖼️ ${targetUser.tag}'s Avatar`)
          .setDescription(`[Direct High-Res Link (4096px)](${avatarUrl})`)
          .setImage(avatarUrl)
          .setFooter({ text: `Requested by ${user.tag}`, iconURL: user.displayAvatarURL() })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      // 4. /banner
      if (commandName === "banner") {
        const targetUser = options.getUser("user") || user;
        let fullUser = targetUser;
        try {
          fullUser = await bot.users.fetch(targetUser.id, { force: true });
        } catch {}

        const bannerUrl = fullUser.bannerURL ? fullUser.bannerURL({ size: 4096 }) : null;
        if (!bannerUrl) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("🖼️ Profile Banner")
            .setDescription(`User **${fullUser.tag}** does not have a custom profile banner configured.`)
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle(`🖼️ ${fullUser.tag}'s Banner`)
          .setDescription(`[Direct High-Res Link (4096px)](${bannerUrl})`)
          .setImage(bannerUrl)
          .setFooter({ text: `Requested by ${user.tag}`, iconURL: user.displayAvatarURL() })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      // 5. /giverole
      if (commandName === "giverole") {
        if (!guild) {
          return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
        }
        const targetUser = options.getUser("member", true);
        const role = options.getRole("role", true) as Role;

        const botMember = guild.members.me;
        if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("⚠️ Missing Permission")
            .setDescription("Yuri Companion lacks the **Manage Roles** permission in this server.")
            .setTimestamp();
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (botMember.roles.highest.position <= role.position) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("⚠️ Role Hierarchy Issue")
            .setDescription(`Cannot assign <@&${role.id}> because it is higher than or equal to Yuri Companion's highest role.`)
            .setTimestamp();
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) {
          return interaction.reply({ content: "Member not found in this guild.", ephemeral: true });
        }

        await targetMember.roles.add(role);

        const embed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("🛡️ Role Granted Successfully")
          .setThumbnail(targetUser.displayAvatarURL())
          .addFields(
            { name: "Target Member", value: `<@${targetUser.id}> (\`${targetUser.tag}\`)`, inline: true },
            { name: "Role Granted", value: `<@&${role.id}> (\`${role.name}\`)`, inline: true },
            { name: "Issued By", value: `<@${user.id}>`, inline: true }
          )
          .setFooter({ text: "Yuri Selfbot Companion • Role Administration" })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      // 6. /removerole
      if (commandName === "removerole") {
        if (!guild) {
          return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
        }
        const targetUser = options.getUser("member", true);
        const role = options.getRole("role", true) as Role;

        const botMember = guild.members.me;
        if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("⚠️ Missing Permission")
            .setDescription("Yuri Companion lacks the **Manage Roles** permission in this server.")
            .setTimestamp();
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (botMember.roles.highest.position <= role.position) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("⚠️ Role Hierarchy Issue")
            .setDescription(`Cannot remove <@&${role.id}> because it is higher than or equal to Yuri Companion's highest role.`)
            .setTimestamp();
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) {
          return interaction.reply({ content: "Member not found in this guild.", ephemeral: true });
        }

        await targetMember.roles.remove(role);

        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🛡️ Role Revoked Successfully")
          .setThumbnail(targetUser.displayAvatarURL())
          .addFields(
            { name: "Target Member", value: `<@${targetUser.id}> (\`${targetUser.tag}\`)`, inline: true },
            { name: "Role Removed", value: `<@&${role.id}> (\`${role.name}\`)`, inline: true },
            { name: "Issued By", value: `<@${user.id}>`, inline: true }
          )
          .setFooter({ text: "Yuri Selfbot Companion • Role Administration" })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      // 7. /serverinfo
      if (commandName === "serverinfo") {
        if (!guild) {
          return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
        }

        const owner = await guild.fetchOwner().catch(() => null);
        const channelsCount = guild.channels.cache.size;
        const textChannels = guild.channels.cache.filter((c) => c.isTextBased()).size;
        const voiceChannels = guild.channels.cache.filter((c) => c.isVoiceBased()).size;
        const rolesCount = guild.roles.cache.size;
        const emojisCount = guild.emojis.cache.size;
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
            { name: "🛡️ Roles", value: `\`${rolesCount}\` roles`, inline: true },
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
        return interaction.reply({ embeds: [embed] });
      }

      // 8. /uptime
      if (commandName === "uptime") {
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
            { name: "🛡️ Access Mode", value: "`Authorized Yuri Accounts Only`", inline: true },
            { name: "⚙️ Engine Version", value: "`Node.js " + process.version + "`", inline: true }
          )
          .setFooter({ text: "Yuri Selfbot Companion Service" })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      // 9. /ping
      if (commandName === "ping") {
        const wsPing = bot.ws.ping;
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🏓 Gateway Pong!")
          .addFields(
            { name: "WebSocket Ping", value: `\`${wsPing}ms\``, inline: true },
            { name: "Status", value: "🟢 Operational (24/7)", inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      // 10. /afk
      if (commandName === "afk") {
        const note = options.getString("message") || "Away from keyboard currently.";
        afkUsers.set(user.id, { message: note, timestamp: Date.now() });

        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("💤 AFK Mode Activated")
          .setDescription(`You are now set to AFK.\n\n• **Reason:** \`${note}\`\n• Mentions and replies will be automatically informed.`)
          .setFooter({ text: "Yuri Selfbot Companion" })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      // 11. /purge
      if (commandName === "purge") {
        if (!guild) {
          return interaction.reply({ content: "Purge is only available in server channels.", ephemeral: true });
        }
        const count = options.getInteger("count", true);
        const channel: any = interaction.channel;
        if (!channel?.bulkDelete) {
          return interaction.reply({ content: "Cannot bulk delete in this channel type.", ephemeral: true });
        }

        const deleted = await channel.bulkDelete(count, true).catch(() => null);
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🧹 Channel Purged")
          .setDescription(`Successfully purged **${deleted?.size || count}** messages from this channel.`)
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // 12. /form (Discord UI Modal Form)
      if (commandName === "form") {
        if (!isAllowed(user.id, activeClients, sessions)) {
          return interaction.reply({
            content: "You don't have permission to use this.",
            ephemeral: true,
          });
        }

        const modal = new ModalBuilder()
          .setCustomId("yuri_modal_form")
          .setTitle("Yuri Bot Form");

        const messageInput = new TextInputBuilder()
          .setCustomId("form_message")
          .setLabel("Message / Content")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("Put anything here...")
          .setRequired(true);

        const titleInput = new TextInputBuilder()
          .setCustomId("form_title")
          .setLabel("Title (Optional - for Embed)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Optional embed title...")
          .setRequired(false);

        const embedInput = new TextInputBuilder()
          .setCustomId("form_embed")
          .setLabel("Send as Embed? (yes / no)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("yes / no (default: no)")
          .setRequired(false);

        const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput);
        const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput);
        const row3 = new ActionRowBuilder<TextInputBuilder>().addComponents(embedInput);

        modal.addComponents(row1, row2, row3);
        return await interaction.showModal(modal);
      }

      // 13. /say
      if (commandName === "say") {
        if (!isAllowed(user.id, activeClients, sessions)) {
          return interaction.reply({
            content: "You don't have permission to use this.",
            ephemeral: true,
          });
        }

        const msgToSend = options.getString("message") || options.getString("text") || "";
        await interaction.reply({
          content: "Notification sent.",
          ephemeral: true,
        });

        return interaction.followUp(msgToSend);
      }

      // 14. /embed
      if (commandName === "embed") {
        if (!isAllowed(user.id, activeClients, sessions)) {
          return interaction.reply({
            content: "You don't have permission to use this.",
            ephemeral: true,
          });
        }

        const msgToSend = options.getString("message") || options.getString("description") || "";
        const title = options.getString("title");

        const messageEmbed = new EmbedBuilder()
          .setDescription(msgToSend)
          .setColor(0xed4245);

        if (title) messageEmbed.setTitle(title);

        await interaction.reply({
          content: "Notification sent.",
          ephemeral: true,
        });

        return interaction.followUp({ embeds: [messageEmbed] });
      }

      // 15. /whitelist
      if (commandName === "whitelist") {
        if (!isOwner(user.id)) {
          return interaction.reply({
            content: "You don't have permission to use this.",
            ephemeral: true,
          });
        }

        const targetUser = options.getUser("user");
        const targetId = targetUser?.id || (options.getString("user_id") || options.getString("user") || "").trim().replace(/[^0-9]/g, "");
        if (!targetId) {
          return interaction.reply({ content: "Invalid user provided.", ephemeral: true });
        }

        yuriBotAllowedUsers.add(targetId);
        saveWhitelist();

        return interaction.reply({
          content: `<@${targetId}> has been whitelisted.`,
        });
      }

      // 16. /unwhitelist
      if (commandName === "unwhitelist") {
        if (!isOwner(user.id)) {
          return interaction.reply({
            content: "You don't have permission to use this.",
            ephemeral: true,
          });
        }

        const targetUser = options.getUser("user");
        const targetId = targetUser?.id || (options.getString("user_id") || options.getString("user") || "").trim().replace(/[^0-9]/g, "");
        if (isOwner(targetId)) {
          return interaction.reply({
            content: "You can't remove the owner.",
            ephemeral: true,
          });
        }

        yuriBotAllowedUsers.delete(targetId);
        saveWhitelist();

        return interaction.reply({
          content: `<@${targetId}> has been removed from the whitelist.`,
        });
      }

      // 17. /whitelisted
      if (commandName === "whitelisted") {
        if (!isOwner(user.id)) {
          return interaction.reply({
            content: "You don't have permission to use this.",
            ephemeral: true,
          });
        }

        if (yuriBotAllowedUsers.size === 0) {
          return interaction.reply({
            content: "The whitelist is empty.",
            ephemeral: true,
          });
        }

        const usersList = Array.from(yuriBotAllowedUsers)
          .sort()
          .map((userId) => `<@${userId}> (\`${userId}\`)`)
          .join("\n");

        return interaction.reply({
          content: usersList,
          ephemeral: true,
        });
      }

      // 17. /snipe
      if (commandName === "snipe") {
        const sniped = snipedMessages.get(interaction.channelId);
        if (!sniped) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("🎯 Message Snipe")
            .setDescription("There are no recently deleted messages recorded in this channel.")
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
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

        return interaction.reply({ embeds: [embed] });
      }

      // 18. /membercount
      if (commandName === "membercount") {
        if (!guild) return interaction.reply({ content: "This command is only available in servers.", ephemeral: true });
        const total = guild.memberCount;
        const bots = guild.members.cache.filter((m: any) => m.user?.bot).size;
        const humans = total - bots;

        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle(`👥 ${guild.name} • Member Count`)
          .addFields(
            { name: "Total Members", value: `\`${total}\``, inline: true },
            { name: "Humans", value: `\`${humans}\``, inline: true },
            { name: "Bots", value: `\`${bots}\``, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      // 19. /roles
      if (commandName === "roles") {
        if (!guild) return interaction.reply({ content: "This command is only available in servers.", ephemeral: true });
        const rolesList = guild.roles.cache
          .filter((r: any) => r.id !== guild.id)
          .map((r: any) => `<@&${r.id}> (\`${r.id}\`)`)
          .slice(0, 20)
          .join("\n");

        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle(`🛡️ ${guild.name} • Server Roles (${guild.roles.cache.size})`)
          .setDescription(rolesList || "No custom roles created.")
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      // 20. /perms
      if (commandName === "perms") {
        const targetUser = options.getUser("user") || user;
        const targetMember = guild?.members.cache.get(targetUser.id);
        if (!targetMember) {
          return interaction.reply({ content: "Member not found in current guild.", ephemeral: true });
        }
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
          .setTitle(`🔐 Permissions: ${targetUser.tag}`)
          .setDescription(
            has.length > 0
              ? has.map((p) => `✅ \`${p}\``).join("\n")
              : "Standard member permissions (No key administrator flags)."
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      // 21. /math
      if (commandName === "math") {
        const expr = options.getString("expression", true);
        try {
          const sanitized = expr.replace(/[^0-9+\-*/().^% ]/g, "");
          // Safe eval
          const result = Function(`'use strict'; return (${sanitized})`)();
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("🧮 Math Calculation")
            .addFields(
              { name: "Expression", value: `\`${expr}\``, inline: true },
              { name: "Result", value: `\`${result}\``, inline: true }
            )
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        } catch {
          return interaction.reply({ content: "Invalid mathematical expression.", ephemeral: true });
        }
      }

      // 22. /8ball
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
        return interaction.reply({ embeds: [embed] });
      }

      // 23. /coinflip
      if (commandName === "coinflip") {
        const outcome = Math.random() > 0.5 ? "🪙 Heads" : "🪙 Tails";
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🪙 Coin Flip")
          .setDescription(`The coin landed on: **${outcome}**!`)
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      // 24. /dice
      if (commandName === "dice") {
        const sides = options.getInteger("sides") || 6;
        const roll = Math.floor(Math.random() * sides) + 1;
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🎲 Dice Roll")
          .setDescription(`You rolled a **d${sides}** and got: **${roll}**!`)
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      // 25. /mock
      if (commandName === "mock") {
        const text = options.getString("text", true);
        const mocked = text
          .split("")
          .map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()))
          .join("");
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🤪 MoCkEd TeXt")
          .setDescription(mocked)
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      // 26. /reverse
      if (commandName === "reverse") {
        const text = options.getString("text", true);
        const reversed = text.split("").reverse().join("");
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🔄 Reversed Text")
          .setDescription(reversed)
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }
    } catch (err: any) {
      console.error("[YURI BOT] Slash command error:", err);
      if (!interaction.replied) {
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
