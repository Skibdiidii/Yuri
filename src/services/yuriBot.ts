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
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
  StreamType,
} from "@discordjs/voice";
import ytdl from "@distube/ytdl-core";
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

// ==========================================
// VOICE & REAL-TIME 24/7 MUSIC STREAMING SYSTEM
// ==========================================
export interface GuildVoiceState {
  connection: any;
  player: any;
  currentSong: { title: string; url: string; requestedBy: string; thumbnail?: string } | null;
  loop: boolean;
  channelId: string;
}

export const guildVoiceStates = new Map<string, GuildVoiceState>();

export async function searchYouTube(query: string): Promise<string | null> {
  const clean = query.trim();
  if (ytdl.validateURL(clean)) return clean;
  try {
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(clean)}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    const html = await res.text();
    const match = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) {
      return `https://www.youtube.com/watch?v=${match[1]}`;
    }
  } catch (e) {
    console.error("[VOICE/MUSIC] YouTube search error:", e);
  }
  return null;
}

export async function playYouTubeAudio(
  guildId: string,
  url: string,
  title?: string,
  requestedBy?: string
): Promise<boolean> {
  const voiceState = guildVoiceStates.get(guildId);
  if (!voiceState || !voiceState.connection) return false;

  try {
    let songTitle = title;
    let songThumb = "";
    try {
      const info = await ytdl.getInfo(url);
      songTitle = songTitle || info.videoDetails.title;
      songThumb = info.videoDetails.thumbnails?.[0]?.url || "";
    } catch {}

    voiceState.currentSong = {
      title: songTitle || "YouTube Track",
      url,
      requestedBy: requestedBy || "User",
      thumbnail: songThumb,
    };

    const stream = ytdl(url, {
      filter: "audioonly",
      quality: "highestaudio",
      highWaterMark: 1 << 25,
      dlChunkSize: 0,
    });

    const resource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
    });

    voiceState.player.play(resource);
    voiceState.connection.subscribe(voiceState.player);
    return true;
  } catch (err) {
    console.error("[VOICE/MUSIC] Play audio error:", err);
    return false;
  }
}

export function getOrCreateGuildVoice(guild: any, channelId: string): GuildVoiceState {
  let state = guildVoiceStates.get(guild.id);
  if (state && state.connection && state.connection.state.status !== VoiceConnectionStatus.Destroyed) {
    return state;
  }

  const connection = joinVoiceChannel({
    channelId: channelId,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: false,
    selfMute: false,
  });

  const player = createAudioPlayer();

  state = {
    connection,
    player,
    currentSong: null,
    loop: false,
    channelId,
  };

  player.on(AudioPlayerStatus.Idle, () => {
    if (state.loop && state.currentSong) {
      playYouTubeAudio(guild.id, state.currentSong.url, state.currentSong.title, state.currentSong.requestedBy);
    } else {
      state.currentSong = null;
    }
  });

  player.on("error", (error) => {
    console.error("[VOICE/MUSIC] Audio Player Error:", error.message);
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch {
      try {
        connection.destroy();
      } catch {}
      guildVoiceStates.delete(guild.id);
    }
  });

  guildVoiceStates.set(guild.id, state);
  return state;
}

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
    description: "Display Yuri 24/7 Companion help menu & command directory (Russian Roulette, Music, Roles)",
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
    name: "playmusic",
    description: "Play real-time YouTube music 24/7 in your voice channel",
    options: [
      {
        name: "query",
        description: "YouTube URL or music name to stream",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
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
    name: "loop",
    description: "Toggle 24/7 loop/repeat mode for the current music track in VC",
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
    .setTitle("⚡ Yuri Companion • Operations Directory")
    .setFooter({
      text: `Yuri Companion Service • Page ${p} of 3 • 24/7 Active`,
      iconURL: botUser?.displayAvatarURL(),
    })
    .setTimestamp();

  if (p === 1) {
    embed
      .setDescription(
        "Dedicated companion service operating 24/7 with pure embed responses, voice channel music streaming, and Russian Roulette."
      )
      .addFields(
        {
          name: "🎲 Russian Roulette",
          value: [
            "`/russian` — Spin the 6-chamber cylinder and pull the trigger (1 lethal round, 5 safe rounds)!",
            "`.russian` — Text prefix trigger for Russian Roulette",
          ].join("\n"),
        },
        {
          name: "🎵 24/7 Voice Channel Music Streaming",
          value: [
            "`/playmusic <query>` — Connect Yuri to your voice channel and stream real-time YouTube music 24/7",
            "`/loop` — Toggle 24/7 repeating loop mode for currently playing music",
            "`/leavevc` — Disconnect Yuri from the voice channel",
          ].join("\n"),
        }
      )
      .setImage("https://i.pinimg.com/originals/5f/a0/e3/5fa0e3e226de58362578fd5e28caabf1.gif");
  } else if (p === 2) {
    embed
      .setDescription(
        "Server administration, role allocation, and security authority."
      )
      .addFields(
        {
          name: "👑 Role Administration (Owner Only)",
          value: [
            "`/give <role> [user]` — Assign a server role with permission & hierarchy validation",
            "`.give <@role> [@user]` or `.giverole` — Prefix shorthand for role assignment",
          ].join("\n"),
        },
        {
          name: "🛡️ Server Operations",
          value: [
            "`.serverinfo` or `.si` — Display comprehensive guild metrics & statistics",
            "`.membercount` — Human vs Bot breakdown in server",
            "`.purge <count>` — Bulk clean messages in current channel",
          ].join("\n"),
        }
      )
      .setImage("https://i.pinimg.com/originals/5f/a0/e3/5fa0e3e226de58362578fd5e28caabf1.gif");
  } else {
    embed
      .setDescription(
        "Diagnostics, service health, and Yuri Companion status."
      )
      .addFields(
        {
          name: "⚡ Diagnostics & Presence",
          value: [
            "`/help` — Display interactive command directory",
            "`.uptime` — Continuous 24/7 uptime & memory metrics",
            "`.ping` — Real-time Gateway WebSocket latency & REST response",
          ].join("\n"),
        },
        {
          name: "🔐 Authorized Access",
          value: [
            "`.whitelisted` — View authorized companion user list",
            "`.whitelist <id>` — Whitelist user ID",
            "`.unwhitelist <id>` — Revoke user whitelist",
          ].join("\n"),
        }
      )
      .setImage("https://i.pinimg.com/originals/5f/a0/e3/5fa0e3e226de58362578fd5e28caabf1.gif");
  }

  // Interactive ActionRow with Pagination Buttons
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("yuri_help_1")
      .setLabel("🎲 Roulette & Music")
      .setStyle(p === 1 ? ButtonStyle.Danger : ButtonStyle.Secondary)
      .setDisabled(p === 1),
    new ButtonBuilder()
      .setCustomId("yuri_help_2")
      .setLabel("👑 Roles & Admin")
      .setStyle(p === 2 ? ButtonStyle.Danger : ButtonStyle.Secondary)
      .setDisabled(p === 2),
    new ButtonBuilder()
      .setCustomId("yuri_help_3")
      .setLabel("⚡ Diagnostics")
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

    try {
      // 1. /help
      if (commandName === "help") {
        const { embed, components } = buildHelpEmbed(1, bot.user);
        return await interaction.reply({ embeds: [embed], components });
      }

      // 2. /russian (Russian Roulette)
      if (commandName === "russian") {
        const isDead = Math.random() < 1 / 6;
        if (isDead) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("💥 BANG! • Russian Roulette")
            .setDescription(
              `🎲 <@${user.id}> spins the 6-chamber cylinder and pulls the trigger...\n\n` +
              `☠️ **The hammer struck the loaded chamber! You took a bullet and DIED!**\n\n` +
              `*Better luck in the next life...*`
            )
            .setFooter({ text: "Yuri Russian Roulette • 1/6 Lethal Chamber" })
            .setTimestamp();
          return await interaction.reply({ embeds: [embed] });
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
          return await interaction.reply({ embeds: [embed] });
        }
      }

      // 3. /give (role only auth to owner)
      if (commandName === "give") {
        if (!isOwner(user.id)) {
          return await interaction.reply({
            content: "You don't have permission to use this.",
            ephemeral: true,
          });
        }

        if (!guild) {
          return await interaction.reply({
            content: "This command can only be executed within a Discord server.",
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
            content: "Yuri lacks the **Manage Roles** permission to grant roles.",
            ephemeral: true,
          });
        }

        if (botMember.roles.highest.position <= role.position) {
          return await interaction.reply({
            content: `Cannot grant role <@&${role.id}> because it is higher than or equal to Yuri's highest role in role hierarchy.`,
            ephemeral: true,
          });
        }

        try {
          await targetMember.roles.add(role);
          const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle("👑 Role Granted")
            .setDescription(`Successfully granted <@&${role.id}> (\`${role.name}\`) to <@${targetMember.id}>.`)
            .setFooter({ text: "Yuri Authorized Owner Administration" })
            .setTimestamp();
          return await interaction.reply({ embeds: [embed] });
        } catch (err: any) {
          return await interaction.reply({
            content: `Failed to grant role: ${err?.message || err}`,
            ephemeral: true,
          });
        }
      }

      // 4. /playmusic (real-time 24/7 YouTube music streaming in VC)
      if (commandName === "playmusic") {
        if (!guild) {
          return await interaction.reply({
            content: "Music can only be played within a server voice channel.",
            ephemeral: true,
          });
        }

        const voiceChannel = (member as GuildMember)?.voice?.channel;
        if (!voiceChannel) {
          return await interaction.reply({
            content: "You must be inside a Voice Channel for Yuri to join you and stream audio!",
            ephemeral: true,
          });
        }

        const query = options.getString("query", true);
        await interaction.deferReply();

        const ytUrl = await searchYouTube(query);
        if (!ytUrl) {
          return await interaction.editReply({
            content: `Could not locate a playable YouTube track for: \`${query}\``,
          });
        }

        try {
          const state = getOrCreateGuildVoice(guild, voiceChannel.id);
          const played = await playYouTubeAudio(guild.id, ytUrl, undefined, user.tag);

          if (!played) {
            return await interaction.editReply({
              content: "Failed to stream YouTube audio. Please try another track or URL.",
            });
          }

          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("🎶 Now Playing • 24/7 Voice Stream")
            .setDescription(
              `📻 **[${state.currentSong?.title || "YouTube Audio"}](${ytUrl})**\n\n` +
              `🔊 **Voice Channel:** <#${voiceChannel.id}>\n` +
              `👤 **Requested By:** <@${user.id}>\n` +
              `🔁 **Loop Mode:** \`${state.loop ? "ON (24/7 Repeating)" : "OFF"}\``
            )
            .setFooter({ text: "Yuri 24/7 Real-Time Voice Engine" })
            .setTimestamp();

          if (state.currentSong?.thumbnail) {
            embed.setThumbnail(state.currentSong.thumbnail);
          }

          return await interaction.editReply({ embeds: [embed] });
        } catch (err: any) {
          return await interaction.editReply({
            content: `Voice stream error: ${err?.message || err}`,
          });
        }
      }

      // 5. /leavevc
      if (commandName === "leavevc") {
        if (!guild) {
          return await interaction.reply({
            content: "This command can only be executed in a server.",
            ephemeral: true,
          });
        }

        const state = guildVoiceStates.get(guild.id);
        if (!state || !state.connection) {
          return await interaction.reply({
            content: "Yuri is not currently connected to any Voice Channel in this server.",
            ephemeral: true,
          });
        }

        try {
          state.player?.stop();
          state.connection?.destroy();
          guildVoiceStates.delete(guild.id);
          return await interaction.reply({
            content: "🔌 Disconnected from Voice Channel and stopped music playback.",
          });
        } catch (err: any) {
          return await interaction.reply({
            content: `Error leaving VC: ${err?.message || err}`,
            ephemeral: true,
          });
        }
      }

      // 6. /loop
      if (commandName === "loop") {
        if (!guild) {
          return await interaction.reply({
            content: "This command can only be executed in a server.",
            ephemeral: true,
          });
        }

        const state = guildVoiceStates.get(guild.id);
        if (!state || !state.currentSong) {
          return await interaction.reply({
            content: "No active music stream is currently playing in voice channel to loop.",
            ephemeral: true,
          });
        }

        state.loop = !state.loop;
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle(state.loop ? "🔂 Music Loop Enabled" : "➡️ Music Loop Disabled")
          .setDescription(
            state.loop
              ? `Current track **${state.currentSong.title}** will now repeat 24/7 continuously.`
              : "Looping disabled. Track will stop after finishing."
          )
          .setFooter({ text: "Yuri Voice Music Controller" })
          .setTimestamp();

        return await interaction.reply({ embeds: [embed] });
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
