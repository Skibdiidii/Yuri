import { prisma } from '../database/db';

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  description: string;
}

export const DEFAULT_SHOP_ITEMS: ShopItem[] = [
  { id: 'vip_pass', name: 'VIP Pass', price: 500, description: 'Exclusive VIP member badge in the community.' },
  { id: 'custom_color', name: 'Custom Role Color', price: 1000, description: 'Change your display color with a custom role.' },
  { id: 'coffee', name: 'Hot Coffee', price: 50, description: 'A cozy cup of coffee to power your chats.' },
  { id: 'lucky_charm', name: 'Lucky Charm', price: 250, description: 'Increases work rewards by 10%.' },
  { id: 'trophy', name: 'Community Trophy', price: 5000, description: 'Prestige item to show off in your inventory.' },
];

export class EconomyManager {
  private static instance: EconomyManager;

  private constructor() {}

  public static getInstance(): EconomyManager {
    if (!EconomyManager.instance) {
      EconomyManager.instance = new EconomyManager();
    }
    return EconomyManager.instance;
  }

  public async getAccount(guildId: string, userId: string) {
    let account = await prisma.economy.findUnique({
      where: { guildId_userId: { guildId, userId } },
    });

    if (!account) {
      account = await prisma.economy.create({
        data: { guildId, userId, wallet: 100, bank: 0 },
      });
    }

    return account;
  }

  public async claimDaily(guildId: string, userId: string): Promise<{ success: boolean; amount: number; message: string }> {
    const account = await this.getAccount(guildId, userId);
    const now = new Date();

    if (account.lastDaily) {
      const diffHours = (now.getTime() - account.lastDaily.getTime()) / (1000 * 60 * 60);
      if (diffHours < 24) {
        const remainingHours = Math.ceil(24 - diffHours);
        return { success: false, amount: 0, message: `You have already claimed your daily reward! Return in **${remainingHours} hours**.` };
      }
    }

    const reward = 200;
    await prisma.economy.update({
      where: { id: account.id },
      data: {
        wallet: account.wallet + reward,
        lastDaily: now,
      },
    });

    return { success: true, amount: reward, message: `You received your daily reward of **💰 200 coins**!` };
  }

  public async work(guildId: string, userId: string): Promise<{ success: boolean; amount: number; message: string }> {
    const account = await this.getAccount(guildId, userId);
    const now = new Date();

    if (account.lastWork) {
      const diffMins = (now.getTime() - account.lastWork.getTime()) / (1000 * 60);
      if (diffMins < 60) {
        const remainingMins = Math.ceil(60 - diffMins);
        return { success: false, amount: 0, message: `You need to rest! You can work again in **${remainingMins} minutes**.` };
      }
    }

    const earnings = Math.floor(Math.random() * 80) + 40; // 40-120 coins
    await prisma.economy.update({
      where: { id: account.id },
      data: {
        wallet: account.wallet + earnings,
        lastWork: now,
      },
    });

    const jobs = ['software development', 'community moderation', 'graphic design', 'music production', 'server maintenance'];
    const job = jobs[Math.floor(Math.random() * jobs.length)];

    return { success: true, amount: earnings, message: `You worked in **${job}** and earned **💰 ${earnings} coins**!` };
  }

  public async transfer(guildId: string, senderId: string, recipientId: string, amount: number): Promise<{ success: boolean; message: string }> {
    if (amount <= 0) return { success: false, message: 'Amount must be greater than 0.' };
    if (senderId === recipientId) return { success: false, message: 'You cannot pay yourself.' };

    const sender = await this.getAccount(guildId, senderId);
    if (sender.wallet < amount) {
      return { success: false, message: `Insufficient funds! You only have **💰 ${sender.wallet} coins** in your wallet.` };
    }

    const recipient = await this.getAccount(guildId, recipientId);

    await prisma.$transaction([
      prisma.economy.update({
        where: { id: sender.id },
        data: { wallet: sender.wallet - amount },
      }),
      prisma.economy.update({
        where: { id: recipient.id },
        data: { wallet: recipient.wallet + amount },
      }),
    ]);

    return { success: true, message: `Successfully transferred **💰 ${amount} coins** to <@${recipientId}>.` };
  }

  public async buyItem(guildId: string, userId: string, itemId: string): Promise<{ success: boolean; message: string }> {
    const item = DEFAULT_SHOP_ITEMS.find((i) => i.id.toLowerCase() === itemId.toLowerCase());
    if (!item) {
      return { success: false, message: `Item \`${itemId}\` does not exist in the shop. Check \`.shop\`!` };
    }

    const account = await this.getAccount(guildId, userId);
    if (account.wallet < item.price) {
      return { success: false, message: `You need **💰 ${item.price} coins** to buy ${item.name} (Wallet: ${account.wallet}).` };
    }

    await prisma.$transaction([
      prisma.economy.update({
        where: { id: account.id },
        data: { wallet: account.wallet - item.price },
      }),
      prisma.inventory.create({
        data: {
          guildId,
          userId,
          itemId: item.id,
          itemName: item.name,
          quantity: 1,
        },
      }),
    ]);

    return { success: true, message: `You successfully purchased **${item.name}** for **💰 ${item.price} coins**!` };
  }

  public async getInventory(guildId: string, userId: string) {
    return prisma.inventory.findMany({
      where: { guildId, userId },
      orderBy: { acquiredAt: 'desc' },
    });
  }
}

export const economyManager = EconomyManager.getInstance();
