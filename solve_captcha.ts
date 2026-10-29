      { name: ".hide / .show", desc: "Manage channel visibility" },
      { name: ".lock / .unlock", desc: "Manage channel send permissions" },
      { name: ".uptime", desc: "Check bot system process time" },
    ],
  },
  20: {
    name: "Internet Search",
    label: "[WEB]",
    color: "#a855f7",
    commands: [
      { name: ".google <query>", desc: "Search the web via Google" },
      { name: ".wiki <query>", desc: "Search Wikipedia encyclopedia" },
      { name: ".crypto <coin>", desc: "Real-time crypto price tracker" },
      { name: ".weather <city>", desc: "Enhanced global weather stats" },
      { name: ".googleimg <q>", desc: "Search images via Google" },
    ],
  },
  21: {
    name: "Social Ratings",
    label: "[RATE]",
    color: "#f43f5e",
    commands: [
      { name: ".ship <@> <@>", desc: "Love compatibility calculator" },
      { name: ".iq / .gay", desc: "Social rating interactions" },
      { name: ".pick / .predict", desc: "Decision making and fortune" },
      { name: ".8ball / .roll", desc: "Classic games and dice" },
      { name: ".cf / .coinflip", desc: "Binary decision coin flip" },
    ],
  },
  22: {
    name: "Profile & Dicts",
    label: "[INFO]",
    color: "#10b981",
    commands: [
      { name: ".pinterest find <q>", desc: "Search Pinterest for PFPs/Ideas" },
      { name: ".urban <query>", desc: "Search Urban Dictionary slang" },
      { name: ".define <word>", desc: "Get formal dictionary definition" },
      { name: ".anime <query>", desc: "Search anime and character info" },
      { name: ".pfpidea <style>", desc: "Get aesthetic PFP suggestions" },
    ],
  },
};

const rotationTimers = new Map<string, NodeJS.Timeout>();
const autoReconnectEnabled = new Map<string, boolean>();
const multiFeatureEnabled = new Map<string, boolean>();


const statusRotator = new Map<string, NodeJS.Timeout>();
const rotatorSettings = new Map<string, { configs: RpcConfig[], interval: number }>();
const customStatusSettings = new Map<string, string[]>();
const menuMode = new Map<string, "text" | "image">();
const autoSkullMode = new Map<string, boolean>();
const ownerIds = new Map<string, string>();
const bullyList = new Map<string, Set<string>>();
const termedUsers = new Map<string, Set<string>>(); 
const lastMessageTime = new Map<string, number>(); 
const packingTargets = new Map<string, string>(); 
const packConfigs = new Map<string, { enabled: boolean; phrases: string[] }>(); 
const packQueues = new Map<string, string[]>(); 
const autoReconnectConfigs = new Map<string, boolean>(); 
const hostingSessions = new Map<string, string>(); 
const allAltTokens = new Set<string>(); 
const intentionalDisconnects = new Set<string>(); 

const persistentTypingEnabled = new Map<string, boolean>(); 
const activeTypingIntervals = new Map<string, NodeJS.Timeout>(); 
const activeTypingChannels = new Map<string, string>(); 
const userCosmetics = new Map<string, any>(); 


const autoReactRules = new Map<string, Map<string, Set<string>>>();
const superReactRules = new Map<string, Map<string, Set<string>>>();
const deletedMessages = new Map<string, Map<string, any>>(); 
const captchaQueue = new Map<
  string,
  {
    id: string;
    sitekey: string;
    url: string;
    type: string;
    resolved?: string;
    expires: number;
  }
>();

const activeBackgrounds = new Map<string, string>();
const helpBackgrounds = new Map<string, string>();
let cdnBotToken: string | null = process.env.DISCORD_BOT_TOKEN || null;
let cdnChannelId: string | null = "1507603344284188705";

async function discordRequest(
  url: string,
  options: RequestInit,
): Promise<Response> {
  
  const delay = Math.floor(Math.random() * 100) + 50; 
  await new Promise((resolve) => setTimeout(resolve, delay));

  
  const headers = new Headers(options.headers);
  headers.set("User-Agent", "DiscordBot (https://discord.js.org, 14.0.0)");

  const response = await fetch(url, { ...options, headers });

  
  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    const delayMs = retryAfter ? parseInt(retryAfter) * 1000 : 2000;
    console.warn(`Rate limited. Retrying after ${delayMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return discordRequest(url, options); 
  }

  return response;
}

async function solveNopecha(
  sitekey: string,
  url: string,
  type: string = "hcaptcha",
) {
  const key = process.env.NOPECHA_KEY || "";

  
  if (key) {
    try {
      const body: any = { type, sitekey, url, key };
      const create = await fetch("https://api.nopecha.com/", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });
      const cData = await create.json();
      if (cData.data) {
        const taskId = cData.data;
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 4000));
          const check = await fetch(
            `https://api.nopecha.com/?key=${key}&id=${taskId}`,
          );
          const rData = await check.json();
          if (rData.data) return rData.data;
        }
      }
    } catch (e) {
      console.error("[NOPECHA API] Error:", e);
    }
  }

  
  const captchaId = Math.random().toString(36).substring(7);
  captchaQueue.set(captchaId, {
    id: captchaId,
    sitekey,
    url,
    type,
    expires: Date.now() + 5 * 60 * 1000, 
  });

