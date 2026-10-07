import dotenv from 'dotenv';
dotenv.config();

// Ensure DATABASE_URL is set before Prisma Client is initialized
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prismaClient: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.prismaClient ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaClient = prisma;
}

/**
 * Ensures guild and guild settings records exist for multi-server isolation.
 * Every server's settings are completely independent and scoped by guildId.
 */
export async function getOrCreateGuildSettings(guildId: string, guildName = 'Server', ownerId = '0') {
  let guild = await prisma.guild.findUnique({
    where: { id: guildId },
  });

  if (!guild) {
    guild = await prisma.guild.create({
      data: {
        id: guildId,
        name: guildName,
        ownerId: ownerId,
      },
    });
  }

  let settings = await prisma.guildSettings.findUnique({
    where: { guildId },
  });

  if (!settings) {
    settings = await prisma.guildSettings.create({
      data: {
        guildId,
        prefix: '.',
      },
    });
  }

  let voiceSettings = await prisma.voiceWelcomeSettings.findUnique({
    where: { guildId },
  });

  if (!voiceSettings) {
    voiceSettings = await prisma.voiceWelcomeSettings.create({
      data: {
        guildId,
        template: 'Hello {display}. Welcome to the server. Make sure you add {owner}.',
      },
    });
  }

  let welcomeSettings = await prisma.welcomeSettings.findUnique({
    where: { guildId },
  });

  if (!welcomeSettings) {
    welcomeSettings = await prisma.welcomeSettings.create({
      data: {
        guildId,
        welcomeMessage: 'Welcome {mention} to {server}! You are member #{memberCount}.',
      },
    });
  }

  return { guild, settings, voiceSettings, welcomeSettings };
}

export default prisma;
