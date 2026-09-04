import {
  Client as DiscordBotClient,
  GatewayIntentBits,
  Partials,
  ActivityType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ApplicationCommandOptionType,
  type ChatInputCommandInteraction,
  type Message,
  type GuildMember,
  type Role,
} from "discord.js";
import path from "path";
import fs from "fs";

export const YURI_BOT_TOKEN =
  process.env.YURI_BOT_TOKEN ||
  process.env.DISCORD_BOT_TOKEN ||
  Buffer.from(
    "TVRVME5UUTJOek01T1RRNU16VXlNVFEzT0EuR1dZb1JVLnU0Q2Y4bXVYeHY2aGdCN0pPZk1pMFk4bTVCLXdfWlgwV1VLa25F",
    "base64"
  ).toString("utf-8");

export const WHITELIST_FILE = path.join(process.cwd(), "whitelist.json");

export const yuriBotAllowedUsers = new Set<string>();

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

// Discord Application (Slash) Commands Definition
export const YURI_SLASH_COMMANDS = [
  {
    name: "help",
    description: "Display Yuri Selfbot Companion commands directory and documentation",
    options: [
      {
        name: "page",
        description: "Select page number (1: Profile, 2: Server & Roles, 3: Automation)",
        type: ApplicationCommandOptionType.Integer,
        required: false,
        choices: [
          { name: "Page 1: Profile & Identity", value: 1 },
          { name: "Page 2: Server & Role Management", value: 2 },
          { name: "Page 3: Utilities & Automation", value: 3 },
        ],
      },
    ],
  },
  {
    name: "whois",
    description: "Inspect detailed profile, roles, permissions, and join dates of a user",
    options: [
      {
        name: "user",
        description: "Target user to inspect (mention or ID)",
        type: ApplicationCommandOptionType.User,
        required: false,
      },
    ],
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
  },
  {
    name: "serverinfo",
    description: "Display comprehensive guild metrics, boost tier, and member statistics",
  },
  {
    name: "uptime",
    description: "Check Yuri 24/7 background companion uptime & health",
  },
  {
    name: "ping",
    description: "Check Gateway WebSocket latency & REST roundtrip",
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
  },
  {
    name: "say",
    description: "Broadcast an embed announcement through Yuri Companion",
    options: [
      {
        name: "text",
        description: "The message text to broadcast",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
  {
    name: "embed",
    description: "Generate a custom formatted crimson embed card",
    options: [
      {
        name: "title",
        description: "Embed title",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
      {
        name: "description",
        description: "Embed main body content",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
  {
    name: "whitelisted",
    description: "View verified selfbot accounts authorized to use Yuri Companion",
  },
  {
    name: "whitelist",
    description: "Authorize a selfbot user ID",
    options: [
      {
        name: "user_id",
        description: "Discord Snowflake User ID",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
  {
    name: "unwhitelist",
    description: "Remove an authorized selfbot user ID",
    options: [
      {
        name: "user_id",
        description: "Discord Snowflake User ID",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
  {
    name: "snipe",
    description: "Retrieve recently deleted message in this channel",
  },
];

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

// Helper: Build pure Help Embed
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
        "Dedicated companion service operating 24/7 with pure embed responses and verified user access control."
      )
      .addFields(
        {
          name: "👤 User & Profile Operations",
          value: [
            "`/whois [user]` or `.whois [user]` — Detailed profile inspection, Snowflake ID, creation & join tenure",
            "`/avatar [user]` or `.avatar [user]` — High-res 4096px direct avatar link with artwork embed",
            "`/banner [user]` or `.banner [user]` — High-resolution banner image extractor",
            "`.id [user]` — Direct Discord Snowflake ID extraction",
            "`.createdat [user]` — Exact account registration timestamp & relative days",
            "`.joinedat [user]` — Server join timestamp & relative tenure",
          ].join("\n"),
        },
        {
          name: "🎭 Identity & Roles",
          value: [
            "`/giverole <member> <role>` or `.giverole` — Grant server role with permission validation",
            "`/removerole <member> <role>` or `.removerole` — Remove server role",
            "`.roles` — List assigned server roles",
            "`.perms` — Inspect channel and guild permission bitfields",
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
            "`/embed <title> <desc>` or `.embed` — Broadcast formatted crimson embed",
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

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("yuri_help_1")
      .setLabel("Page 1: Profile")
      .setStyle(p === 1 ? ButtonStyle.Danger : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("yuri_help_2")
      .setLabel("Page 2: Roles & Guild")
      .setStyle(p === 2 ? ButtonStyle.Danger : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("yuri_help_3")
      .setLabel("Page 3: Automation")
      .setStyle(p === 3 ? ButtonStyle.Danger : ButtonStyle.Secondary)
  );

  return { embed, components: [row] };
}

export async function startYuriBot(
  getActiveClients?: () => Map<string, any>,
  getSessions?: () => Map<string, any>
): Promise<void> {
  if (yuriBotClient) {
    try {
      yuriBotClient.destroy();
    } catch {}
    yuriBotClient = null;
  }

  clearTimeout(reconnectTimer);

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
          { name: "Yuri Selfbot | /help", type: ActivityType.Playing },
        ],
        status: "online",
      });
    } catch {}

    // Register Application (Slash) Commands
    try {
      console.log("[YURI BOT 24/7] Registering Application Slash Commands globally...");
      await bot.application?.commands.set(YURI_SLASH_COMMANDS as any);
      console.log(`[YURI BOT 24/7] Registered ${YURI_SLASH_COMMANDS.length} global slash commands.`);

      // Also register on each cached guild for instant activation without Discord 1-hour delay
      for (const guild of bot.guilds.cache.values()) {
        guild.commands.set(YURI_SLASH_COMMANDS as any).catch(() => {});
      }
    } catch (e: any) {
      console.error("[YURI BOT 24/7] Failed registering slash commands:", e?.message || e);
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

  // Keep-alive presence loop
  setInterval(() => {
    if (bot.isReady() && bot.user) {
      try {
        bot.user.setPresence({
          activities: [
            { name: "Yuri Selfbot | /help", type: ActivityType.Playing },
          ],
          status: "online",
        });
      } catch {}
    }
  }, 60000);

  // ==========================================
  // DISCORD APPLICATION (SLASH) COMMANDS & BUTTONS
  // ==========================================
  bot.on("interactionCreate", async (interaction: any) => {
    // 1. Handle Help Pagination Buttons
    if (interaction.isButton()) {
      if (interaction.customId.startsWith("yuri_help_")) {
        const pageNum = parseInt(interaction.customId.replace("yuri_help_", ""), 10) || 1;
        const { embed, components } = buildHelpEmbed(pageNum, bot.user);
        await interaction.update({ embeds: [embed], components }).catch(() => {});
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, user, guild, member } = interaction as ChatInputCommandInteraction;
    const activeClients = getActiveClients ? getActiveClients() : undefined;
    const sessions = getSessions ? getSessions() : undefined;

    // Strict Access Control: only verified Yuri Selfbot users
    if (!isAuthorizedSelfbotUser(user.id, activeClients, sessions)) {
      return interaction.reply({
        embeds: [buildAccessDeniedEmbed(user.id)],
        ephemeral: true,
      });
    }

    try {
      // 1. /help
      if (commandName === "help") {
        const page = options.getInteger("page") || 1;
        const { embed, components } = buildHelpEmbed(page, bot.user);
        return interaction.reply({ embeds: [embed], components });
      }

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

      // 12. /say
      if (commandName === "say") {
        const text = options.getString("text", true);
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription(text)
          .setFooter({ text: `Broadcast by ${user.tag}` })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      // 13. /embed
      if (commandName === "embed") {
        const title = options.getString("title") || "Announcement";
        const description = options.getString("description", true);
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle(title)
          .setDescription(description)
          .setFooter({ text: `Yuri Selfbot • ${user.tag}` })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      // 14. /whitelisted
      if (commandName === "whitelisted") {
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
        return interaction.reply({ embeds: [embed] });
      }

      // 15. /whitelist
      if (commandName === "whitelist") {
        const targetId = options.getString("user_id", true).trim().replace(/[^0-9]/g, "");
        if (!targetId || targetId.length < 15) {
          return interaction.reply({ content: "Invalid Discord Snowflake ID provided.", ephemeral: true });
        }
        yuriBotAllowedUsers.add(targetId);
        saveWhitelist();

        const embed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("✅ Selfbot Account Authorized")
          .setDescription(`Discord ID <@${targetId}> (\`${targetId}\`) is now authorized to use Yuri Companion.`)
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      // 16. /unwhitelist
      if (commandName === "unwhitelist") {
        const targetId = options.getString("user_id", true).trim().replace(/[^0-9]/g, "");
        yuriBotAllowedUsers.delete(targetId);
        saveWhitelist();

        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🗑️ Authorization Revoked")
          .setDescription(`Discord ID \`${targetId}\` has been removed from the companion authorization list.`)
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
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

    // Strict access control: only authorized Yuri Selfbot accounts
    if (!isAuthorizedSelfbotUser(message.author.id, activeClients, sessions)) {
      await message.reply({ embeds: [buildAccessDeniedEmbed(message.author.id)] }).catch(() => {});
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
  });

  try {
    await bot.login(YURI_BOT_TOKEN);
    yuriBotClient = bot;
  } catch (err: any) {
    console.error("[YURI BOT] Login failure:", err?.message || err);
    throw err;
  }
}

export function getYuriBotStatus(getActiveClients?: () => Map<string, any>) {
  const isOnline = !!(yuriBotClient && yuriBotClient.isReady());
  const uptimeSec = isOnline ? Math.floor((Date.now() - yuriBotStartTime) / 1000) : 0;
  return {
    online: isOnline,
    tag: yuriBotClient?.user?.tag || "Offline",
    id: yuriBotClient?.user?.id || "1545467399493521478",
    avatar: yuriBotClient?.user?.displayAvatarURL() || "",
    ping: yuriBotClient?.ws?.ping || 0,
    uptime: uptimeSec,
    guildsCount: yuriBotClient?.guilds?.cache?.size || 0,
    authorizedUsers: Array.from(yuriBotAllowedUsers),
  };
}
