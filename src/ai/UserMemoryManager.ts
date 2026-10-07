import { GuildMember, User as DiscordUser } from 'discord.js';
import { prisma } from '../database/db';
import { LogService } from '../services/LogService';

export interface UserMemoryData {
  userId: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  accentColor?: string | null;
  bio?: string | null;
  rolesSummary?: string | null;
  facts: string[];
  notes: string;
  personality: string;
  conversationCount: number;
  lastSeenAt: Date;
}

export class UserMemoryManager {
  private static instance: UserMemoryManager;

  private constructor() {}

  public static getInstance(): UserMemoryManager {
    if (!UserMemoryManager.instance) {
      UserMemoryManager.instance = new UserMemoryManager();
    }
    return UserMemoryManager.instance;
  }

  /**
   * Fetches full Discord profile info including banner, accent color, badges, and roles,
   * combining it with long-term stored memory facts.
   */
  public async getOrBuildProfileContext(
    member?: GuildMember | null,
    user?: DiscordUser | null
  ): Promise<{ memory: UserMemoryData; promptContext: string }> {
    const targetUser = user || member?.user;
    if (!targetUser) {
      return {
        memory: {
          userId: 'anonymous',
          username: 'Guest',
          facts: [],
          notes: '',
          personality: '',
          conversationCount: 0,
          lastSeenAt: new Date(),
        },
        promptContext: 'User: Anonymous Guest',
      };
    }

    const userId = targetUser.id;
    let fullUser = targetUser;

    // Fetch full user to get banner and accent color
    try {
      if (typeof targetUser.fetch === 'function') {
        fullUser = await targetUser.fetch(true);
      }
    } catch {
      // Ignore if fetch fails (e.g., API rate limit)
    }

    const username = fullUser.username;
    const globalName = fullUser.globalName || fullUser.username;
    const displayName = member?.displayName || globalName;
    const avatarUrl = fullUser.displayAvatarURL({ size: 512, extension: 'png' });
    const bannerUrl = fullUser.bannerURL({ size: 1024, extension: 'png' }) || null;
    const accentColor = fullUser.hexAccentColor || null;
    
    // Server roles
    const rolesList = member?.roles?.cache
      ? member.roles.cache
          .filter((r) => r.name !== '@everyone')
          .map((r) => r.name)
          .slice(0, 15)
          .join(', ')
      : '';

    // Badges / Flags
    const flags = fullUser.flags?.toArray() || [];
    const badgesStr = flags.length > 0 ? flags.join(', ') : 'None';

    // Account ages
    const accountCreated = fullUser.createdAt ? fullUser.createdAt.toDateString() : 'Unknown';
    const serverJoined = member?.joinedAt ? member.joinedAt.toDateString() : 'Unknown';
    const isBooster = member?.premiumSince ? `Server Booster since ${member.premiumSince.toDateString()}` : 'No';

    // Retrieve or create DB memory record
    let dbRecord = await prisma.userAIMemory.findUnique({
      where: { userId },
    });

    let facts: string[] = [];
    if (dbRecord?.facts) {
      try {
        facts = JSON.parse(dbRecord.facts);
      } catch {
        facts = [];
      }
    }

    if (!dbRecord) {
      dbRecord = await prisma.userAIMemory.create({
        data: {
          userId,
          username,
          displayName,
          avatarUrl,
          bannerUrl,
          accentColor,
          rolesSummary: rolesList,
          facts: JSON.stringify(facts),
          notes: `First met in server on ${new Date().toLocaleDateString()}`,
          conversationCount: 1,
        },
      });
    } else {
      // Update fresh profile details
      await prisma.userAIMemory.update({
        where: { userId },
        data: {
          username,
          displayName,
          avatarUrl,
          bannerUrl: bannerUrl || dbRecord.bannerUrl,
          accentColor: accentColor || dbRecord.accentColor,
          rolesSummary: rolesList || dbRecord.rolesSummary,
          conversationCount: { increment: 1 },
          lastSeenAt: new Date(),
        },
      });
    }

    const memoryData: UserMemoryData = {
      userId,
      username,
      displayName,
      avatarUrl,
      bannerUrl: bannerUrl || dbRecord.bannerUrl,
      accentColor: accentColor || dbRecord.accentColor,
      bio: dbRecord.bio,
      rolesSummary: rolesList || dbRecord.rolesSummary,
      facts,
      notes: dbRecord.notes || '',
      personality: dbRecord.personality || '',
      conversationCount: dbRecord.conversationCount + 1,
      lastSeenAt: new Date(),
    };

    // Construct the context block to inject into the AI system instruction
    const factsFormatted =
      facts.length > 0
        ? facts.map((f, i) => `  ${i + 1}. ${f}`).join('\n')
        : '  (No specific personal facts saved yet; learn and remember things they tell you!)';

    const promptContext = `
========================================
👤 COMPANION PROFILE & LONG-TERM MEMORY
========================================
You are talking to:
• Name: ${displayName} (@${username})
• Discord User ID: ${userId}
• Discord Avatar: ${avatarUrl}
• Profile Banner: ${bannerUrl || 'Default/None'}
• Accent Color: ${accentColor || 'None'}
• Discord Badges: ${badgesStr}
• Server Roles: ${rolesList || 'Member'}
• Server Booster: ${isBooster}
• Discord Account Created: ${accountCreated}
• Server Joined: ${serverJoined}
• Lifetime AI Interactions: ${memoryData.conversationCount} chats

🧠 What you remember about ${displayName}:
${factsFormatted}
${memoryData.notes ? `• AI Observations & History: ${memoryData.notes}` : ''}
${memoryData.personality ? `• Personality & Interests: ${memoryData.personality}` : ''}

INSTRUCTIONS FOR USER INTERACTION:
- Treat ${displayName} as an individual you know and remember.
- If they ask about themselves ("who am I?", "what do you remember about me?", "what is my banner?", "what are my roles?"), actively reference their real Discord profile, banner, avatar, badges, roles, and remembered facts.
- When they share personal details (favorite games, pets, coding languages, location, hobbies, life events), remember it naturally.
========================================
`.trim();

    return {
      memory: memoryData,
      promptContext,
    };
  }

  /**
   * Records a new fact into the user's permanent memory
   */
  public async addFact(userId: string, fact: string): Promise<string[]> {
    let dbRecord = await prisma.userAIMemory.findUnique({ where: { userId } });
    let facts: string[] = [];
    if (dbRecord?.facts) {
      try {
        facts = JSON.parse(dbRecord.facts);
      } catch {
        facts = [];
      }
    }

    if (!facts.includes(fact)) {
      facts.push(fact);
      if (facts.length > 30) facts.shift(); // Keep top 30 key facts
    }

    await prisma.userAIMemory.upsert({
      where: { userId },
      create: {
        userId,
        username: 'User',
        facts: JSON.stringify(facts),
      },
      update: {
        facts: JSON.stringify(facts),
        lastSeenAt: new Date(),
      },
    });

    return facts;
  }

  /**
   * Resets or forgets all memories for a given user
   */
  public async forgetUser(userId: string): Promise<boolean> {
    try {
      await prisma.userAIMemory.delete({
        where: { userId },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Retrieves stored memory record
   */
  public async getUserMemory(userId: string): Promise<UserMemoryData | null> {
    const record = await prisma.userAIMemory.findUnique({ where: { userId } });
    if (!record) return null;

    let facts: string[] = [];
    if (record.facts) {
      try {
        facts = JSON.parse(record.facts);
      } catch {
        facts = [];
      }
    }

    return {
      userId: record.userId,
      username: record.username,
      displayName: record.displayName,
      avatarUrl: record.avatarUrl,
      bannerUrl: record.bannerUrl,
      accentColor: record.accentColor,
      bio: record.bio,
      rolesSummary: record.rolesSummary,
      facts,
      notes: record.notes,
      personality: record.personality,
      conversationCount: record.conversationCount,
      lastSeenAt: record.lastSeenAt,
    };
  }

  /**
   * Simple background extraction heuristic to remember key details
   */
  public async autoLearnFromChat(userId: string, username: string, messageContent: string): Promise<void> {
    const text = messageContent.trim();
    if (text.length < 5 || text.startsWith('.')) return;

    // Heuristics for direct personal statements
    const patterns = [
      { regex: /(?:my name is|call me|i am called)\s+([A-Za-z0-9_ ]+)/i, prefix: 'Name is ' },
      { regex: /(?:i love|i really like|my favorite is|my favorite thing is)\s+([A-Za-z0-9_ ,]+)/i, prefix: 'Likes ' },
      { regex: /(?:i have a pet|my pet is|my dog is|my cat is)\s+([A-Za-z0-9_ ]+)/i, prefix: 'Has pet ' },
      { regex: /(?:i play|my main game is|i'm playing)\s+([A-Za-z0-9_ ]+)/i, prefix: 'Plays ' },
      { regex: /(?:i work as a|i am a|my job is)\s+([A-Za-z0-9_ ]+)/i, prefix: 'Works as ' },
      { regex: /(?:i live in|i am from|i'm from)\s+([A-Za-z0-9_ ]+)/i, prefix: 'From ' },
    ];

    for (const p of patterns) {
      const match = text.match(p.regex);
      if (match && match[1]) {
        const fact = `${p.prefix}${match[1].trim().slice(0, 60)}`;
        await this.addFact(userId, fact).catch(() => {});
      }
    }
  }
}

export const userMemoryManager = UserMemoryManager.getInstance();
