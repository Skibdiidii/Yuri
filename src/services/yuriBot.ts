import {
  Client as DiscordBotClient,
  GatewayIntentBits,
  Partials,
  ActivityType,
  EmbedBuilder,
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

  bot.on("ready", () => {
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

  // Keep-alive presence check
  setInterval(() => {
    if (bot.isReady() && bot.user) {
      try {
        bot.user.setPresence({
          activities: [
            { name: "Yuri Selfbot | .help", type: ActivityType.Playing },
          ],
          status: "online",
        });
      } catch {}
    }
  }, 60000);

  // Command handling
  bot.on("messageCreate", async (message: any) => {
    if (message.author?.bot) return;

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

    // Strict access control: ONLY selfbot users of the user
    if (!isAuthorizedSelfbotUser(message.author.id, activeClients, sessions)) {
      await message
        .reply(
          "> 🔒 **Access Restricted:** Yuri Bot commands are exclusively available to authorized Yuri Selfbot accounts."
        )
        .catch(() => {});
      return;
    }

    // ORIGINAL SELFBOT COMMANDS IN BOT VERSION:

    // 1. HELP
    if (command === "help") {
      const embed = new EmbedBuilder()
        .setTitle("Yuri Selfbot | Commands Reference")
        .setDescription(
          "Dedicated 24/7 Yuri Bot automation companion. Exclusively active for your selfbot accounts."
        )
        .setColor(0xed4245)
        .setImage(
          "https://i.pinimg.com/originals/5f/a0/e3/5fa0e3e226de58362578fd5e28caabf1.gif"
        )
        .addFields(
          {
            name: "👤 User & Profile Commands",
            value: [
              "`whois [user]` / `ui` - Full profile inspection with creation & join dates",
              "`avatar [user]` / `av` / `pfp` - High-resolution 4096px direct avatar link",
              "`banner [user]` - High-resolution profile banner link",
              "`id [user]` - Extract clean Discord Snowflake ID",
              "`createdat [user]` - Exact account registration timestamp & days ago",
              "`joinedat [user]` - Exact server join timestamp & tenure",
              "`roles` - List assigned server roles",
              "`perms` - List active guild permission nodes",
            ].join("\n"),
          },
          {
            name: "🏰 Server & Guild Commands",
            value: [
              "`serverinfo` / `si` - Server metrics, owner ID, member count, channel stats & boost level",
            ].join("\n"),
          },
          {
            name: "⚡ Utility & Selfbot Controls",
            value: [
              "`uptime` - 24/7 runtime duration and bot uptime",
              "`ping` - Real-time Gateway WebSocket response latency",
              "`say <message>` - Broadcast message directly through bot",
              "`embed <message>` - Format and broadcast crimson embed card",
              "`afk [message]` - Toggle AFK status auto-responder",
              "`typing [seconds]` - Send active typing indicators",
              "`whitelisted` / `selfbots` - View authorized selfbot user accounts",
              "`whitelist <userId>` - Add selfbot user ID",
              "`unwhitelist <userId>` - Remove selfbot user ID",
            ].join("\n"),
          }
        )
        .setFooter({
          text: "Yuri Selfbot • 24/7 Dedicated Automation",
          iconURL: bot.user?.displayAvatarURL(),
        })
        .setTimestamp();

      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }

    // 2. PING
    if (command === "ping") {
      const wsPing = bot.ws?.ping || 0;
      await message
        .reply(`> 🏓 **Pong!** Gateway WebSocket: \`${wsPing}ms\``)
        .catch(() => {});
      return;
    }

    // 3. UPTIME
    if (command === "uptime") {
      const totalSeconds = Math.floor((Date.now() - yuriBotStartTime) / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      await message
        .reply(
          `> 🚀 **Uptime:** \`${hours}h ${minutes}m ${seconds}s\` (Active 24/7)`
        )
        .catch(() => {});
      return;
    }

    // 4. WHOIS / UI / USERINFO
    if (command === "whois" || command === "ui" || command === "userinfo") {
      let targetUser = message.mentions.users.first();
      if (!targetUser && message.reference?.messageId) {
        try {
          const refMsg = await message.channel.messages.fetch(
            message.reference.messageId
          );
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
      const createdDaysAgo = Math.floor(
        (Date.now() - fullUser.createdAt.getTime()) / 86400000
      );
      const joinedDaysAgo = member?.joinedAt
        ? Math.floor((Date.now() - member.joinedAt.getTime()) / 86400000)
        : null;
      const avatarUrl = fullUser.displayAvatarURL({
        extension: "png",
        size: 4096,
      });
      const bannerUrl = fullUser.bannerURL
        ? fullUser.bannerURL({ extension: "png", size: 4096 })
        : null;
      const displayName =
        fullUser.globalName || fullUser.displayName || fullUser.username;
      const nickname = member?.nickname ? ` (${member.nickname})` : "";

      const roles =
        member && member.roles.cache.size > 1
          ? member.roles.cache
              .filter((r: any) => r.id !== message.guild?.id)
              .map((r: any) => `<@&${r.id}>`)
              .slice(0, 6)
              .join(" ")
          : "None";

      const lines = [
        `> 👤 **User Information**`,
        `> **Username:** \`${fullUser.tag}\`${nickname}`,
        `> **Display Name:** **${displayName}**`,
        `> **User ID:** \`${fullUser.id}\``,
        `> **Account Created:** \`${
          fullUser.createdAt.toISOString().split("T")[0]
        }\` (${createdDaysAgo}d ago)`,
      ];
      if (joinedDaysAgo !== null && member?.joinedAt) {
        lines.push(
          `> **Joined Server:** \`${
            member.joinedAt.toISOString().split("T")[0]
          }\` (${joinedDaysAgo}d ago)`
        );
      }
      if (member) lines.push(`> **Roles:** ${roles}`);
      if (fullUser.bot) lines.push(`> **Account Type:** \`Bot Application\``);
      if (bannerUrl) lines.push(`> **Banner:** ${bannerUrl}`);
      lines.push(`> **Avatar:** ${avatarUrl}`);

      await message.reply(lines.join("\n")).catch(() => {});
      return;
    }

    // 5. AVATAR / AV / PFP
    if (command === "avatar" || command === "av" || command === "pfp") {
      let targetUser = message.mentions.users.first();
      if (!targetUser && message.reference?.messageId) {
        try {
          const refMsg = await message.channel.messages.fetch(
            message.reference.messageId
          );
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

      const avatarUrl = targetUser.displayAvatarURL({
        extension: "png",
        size: 4096,
      });
      const lines = [
        `> 🖼️ **${targetUser.tag}'s Avatar**`,
        `> **User ID:** \`${targetUser.id}\``,
        `> **Direct Link:** ${avatarUrl}`,
        avatarUrl,
      ];
      await message.reply(lines.join("\n")).catch(() => {});
      return;
    }

    // 6. BANNER
    if (command === "banner") {
      let targetUser = message.mentions.users.first();
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
      const bannerUrl = fullUser?.bannerURL
        ? fullUser.bannerURL({ extension: "png", size: 4096 })
        : null;
      if (bannerUrl) {
        const lines = [
          `> 🎨 **${targetUser.tag}'s Banner**`,
          `> **User ID:** \`${targetUser.id}\``,
          `> **Direct Link:** ${bannerUrl}`,
          bannerUrl,
        ];
        await message.reply(lines.join("\n")).catch(() => {});
      } else {
        await message
          .reply(
            `> ❌ **${targetUser.tag}** does not have a profile banner set.`
          )
          .catch(() => {});
      }
      return;
    }

    // 7. SERVERINFO / SI
    if (command === "serverinfo" || command === "si") {
      if (!message.guild) {
        await message
          .reply("> ❌ This command can only be used inside a server.")
          .catch(() => {});
        return;
      }
      const g = message.guild;
      const createdDaysAgo = Math.floor(
        (Date.now() - g.createdAt.getTime()) / 86400000
      );
      const iconUrl = g.iconURL({ extension: "png", size: 2048 });
      const textCount =
        g.channels?.cache?.filter((c: any) => c.isTextBased())?.size || 0;
      const voiceCount =
        g.channels?.cache?.filter((c: any) => c.isVoiceBased())?.size || 0;

      const lines = [
        `> 🏰 **Server Information**`,
        `> **Server Name:** **${g.name}**`,
        `> **Server ID:** \`${g.id}\``,
        `> **Owner:** <@${g.ownerId}> (\`${g.ownerId}\`)`,
        `> **Members:** \`${g.memberCount}\``,
        `> **Channels:** \`${
          g.channels?.cache?.size || 0
        }\` (Text: \`${textCount}\` | Voice: \`${voiceCount}\`)`,
        `> **Roles:** \`${g.roles?.cache?.size || 0}\``,
        `> **Created:** \`${
          g.createdAt.toISOString().split("T")[0]
        }\` (${createdDaysAgo}d ago)`,
      ];
      if (g.premiumSubscriptionCount) {
        lines.push(
          `> **Server Boosts:** \`${g.premiumSubscriptionCount}\` (Tier ${
            g.premiumTier || 0
          })`
        );
      }
      if (iconUrl) {
        lines.push(`> **Server Icon:** ${iconUrl}`);
      }
      await message.reply(lines.join("\n")).catch(() => {});
      return;
    }

    // 8. ID
    if (command === "id") {
      let targetUser = message.mentions.users.first() || message.author;
      if (parts[0]) {
        const cleanId = parts[0].replace(/[^0-9]/g, "");
        if (cleanId) {
          try {
            targetUser = await bot.users.fetch(cleanId);
          } catch {}
        }
      }
      await message
        .reply(`> 🆔 **${targetUser.tag} ID:** \`${targetUser.id}\``)
        .catch(() => {});
      return;
    }

    // 9. CREATEDAT
    if (command === "createdat") {
      let targetUser = message.mentions.users.first() || message.author;
      const daysAgo = Math.floor(
        (Date.now() - targetUser.createdAt.getTime()) / 86400000
      );
      await message
        .reply(
          `> 📅 **${targetUser.tag} Account Created:** \`${
            targetUser.createdAt.toISOString().split("T")[0]
          }\` (${daysAgo}d ago)`
        )
        .catch(() => {});
      return;
    }

    // 10. JOINEDAT
    if (command === "joinedat") {
      const member = message.mentions.members?.first() || message.member;
      if (member?.joinedAt) {
        const daysAgo = Math.floor(
          (Date.now() - member.joinedAt.getTime()) / 86400000
        );
        await message
          .reply(
            `> 📥 **${member.user.tag} Server Join Date:** \`${
              member.joinedAt.toISOString().split("T")[0]
            }\` (${daysAgo}d ago)`
          )
          .catch(() => {});
      } else {
        await message
          .reply(
            "> ❌ Could not find join date for this user in this server."
          )
          .catch(() => {});
      }
      return;
    }

    // 11. ROLES
    if (command === "roles") {
      if (message.member) {
        const roleList = message.member.roles.cache
          .filter((r: any) => r.id !== message.guild?.id)
          .map((r: any) => `<@&${r.id}>`)
          .join(" ");
        const lines = [
          `> 🏷️ **Your Roles (${Math.max(
            0,
            message.member.roles.cache.size - 1
          )})**`,
          `> ${roleList || "None"}`,
        ];
        await message.reply(lines.join("\n")).catch(() => {});
      }
      return;
    }

    // 12. PERMS
    if (command === "perms") {
      if (message.member) {
        const perms = message.member.permissions.toArray().join(", ");
        const lines = [`> 🛡️ **Your Permissions**`, `> \`${perms}\``];
        await message.reply(lines.join("\n")).catch(() => {});
      }
      return;
    }

    // 13. SAY
    if (command === "say") {
      const text = parts.join(" ");
      if (text) {
        await message.delete().catch(() => {});
        await message.channel.send(text).catch(() => {});
      }
      return;
    }

    // 14. EMBED
    if (command === "embed") {
      const text = parts.join(" ");
      if (text) {
        await message.delete().catch(() => {});
        const embed = new EmbedBuilder()
          .setDescription(text)
          .setColor(0xed4245);
        await message.channel.send({ embeds: [embed] }).catch(() => {});
      }
      return;
    }

    // 15. WHITELIST
    if (command === "whitelist") {
      const targetId = parts[0]?.replace(/[^0-9]/g, "");
      if (targetId) {
        yuriBotAllowedUsers.add(targetId);
        saveWhitelist();
        await message
          .reply(
            `> ✅ User ID \`${targetId}\` added to Yuri Bot authorized selfbot accounts.`
          )
          .catch(() => {});
      } else {
        await message
          .reply(
            "> ❌ Please specify a valid Discord user ID: `.whitelist <id>`"
          )
          .catch(() => {});
      }
      return;
    }

    // 16. UNWHITELIST
    if (command === "unwhitelist") {
      const targetId = parts[0]?.replace(/[^0-9]/g, "");
      if (targetId) {
        yuriBotAllowedUsers.delete(targetId);
        saveWhitelist();
        await message
          .reply(
            `> 🗑️ User ID \`${targetId}\` removed from Yuri Bot whitelist.`
          )
          .catch(() => {});
      } else {
        await message
          .reply(
            "> ❌ Please specify a valid Discord user ID: `.unwhitelist <id>`"
          )
          .catch(() => {});
      }
      return;
    }

    // 17. WHITELISTED / SELFBOTS
    if (command === "whitelisted" || command === "selfbots") {
      const activeIds = activeClients
        ? Array.from(activeClients.values())
            .map((c: any) => c.user?.id)
            .filter(Boolean)
        : [];
      const allAllowed = Array.from(
        new Set([...Array.from(yuriBotAllowedUsers), ...activeIds])
      );
      const lines = [
        `> 🛡️ **Authorized Selfbot Accounts (${allAllowed.length})**`,
        `> Yuri Bot is strictly restricted to these selfbot accounts:`,
        ...allAllowed.map((id) => `> • <@${id}> (\`${id}\`)`),
      ];
      await message.reply(lines.join("\n")).catch(() => {});
      return;
    }
  });

  try {
    await bot.login(YURI_BOT_TOKEN);
    yuriBotClient = bot;
  } catch (err: any) {
    console.error("[YURI BOT] Failed to login:", err?.message || err);
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      startYuriBot(getActiveClients, getSessions).catch(() => {});
    }, 10000);
  }
}

export function getYuriBotStatus(
  getActiveClients?: () => Map<string, any>
) {
  const isOnline = !!yuriBotClient && yuriBotClient.isReady();
  const activeClients = getActiveClients ? getActiveClients() : undefined;
  const activeIds = activeClients
    ? Array.from(activeClients.values())
        .map((c: any) => c.user?.id)
        .filter(Boolean)
    : [];
  const allAllowed = Array.from(
    new Set([...Array.from(yuriBotAllowedUsers), ...activeIds])
  );

  return {
    online: isOnline,
    tag: yuriBotClient?.user?.tag || "Бог добр#5735",
    id: yuriBotClient?.user?.id || "1545467399493521478",
    avatar: yuriBotClient?.user?.displayAvatarURL?.() || "",
    ping: yuriBotClient?.ws?.ping || 0,
    uptime: isOnline ? Math.floor((Date.now() - yuriBotStartTime) / 1000) : 0,
    guildsCount: yuriBotClient?.guilds?.cache?.size || 0,
    authorizedUsers: allAllowed,
  };
}
