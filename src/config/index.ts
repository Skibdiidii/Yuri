import dotenv from 'dotenv';
dotenv.config();

export interface HarumiConfig {
  name: string;
  aiName: string;
  version: string;
  defaultPrefix: string;
  token: string;
  clientId: string;
  aiEndpoint: string;
  aiModel: string;
  aiKey: string;
  port: number;
  openWeatherKey?: string;
  finnhubKey?: string;
  newsApiKey?: string;
  defaultWelcomeTemplate: string;
  cooldowns: {
    defaultCommand: number;
    aiCommand: number;
    ttsWelcome: number;
  };
}

export const config: HarumiConfig = {
  name: 'Harumi',
  aiName: 'Harumi AI',
  version: '1.0.0',
  defaultPrefix: '.',
  token: process.env.DISCORD_TOKEN || Buffer.from('TVRVMU1qYzFPRFk0TVRVM01qSXlNVEUwT0EuR3U5bDNoLk1JRVlPRnMzNGVhZHhDbG1kYVgwTmpmVzlwTXFseGt5NFdRQXFB', 'base64').toString('utf-8'),
  clientId: process.env.DISCORD_CLIENT_ID || '1552758681572221148',
  aiEndpoint: process.env.AI_API_ENDPOINT || 'https://api.mistral.ai/v1',
  aiModel: process.env.AI_MODEL || 'open-mistral-7b',
  aiKey: process.env.AI_KEY || 'B4uCaEJo9ZCuZo5Am6BpAwt30lP86WMu',
  port: parseInt(process.env.PORT || '3000', 10),
  openWeatherKey: process.env.OPENWEATHER_API_KEY,
  finnhubKey: process.env.FINNHUB_API_KEY,
  newsApiKey: process.env.NEWS_API_KEY,
  defaultWelcomeTemplate: 'Hello {display}. Welcome to the server. Make sure you add {owner}.',
  cooldowns: {
    defaultCommand: 2,
    aiCommand: 5,
    ttsWelcome: 10,
  },
};
