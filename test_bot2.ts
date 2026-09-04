import { Client, GatewayIntentBits } from 'discord.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.on('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  const guild = client.guilds.cache.get("1545400179379806218");
  if (!guild) {
    console.log("Guild not found.");
    process.exit(1);
  }
  
  try {
    const member = await guild.members.fetch("1545521054930436167");
    console.log(`Found member: ${member.user.tag}`);
    
    await member.roles.add("1545408147382997022");
    console.log("Successfully gave the role!");
  } catch (err) {
    console.error("Error giving role:", err);
  }
  process.exit(0);
});

client.login(Buffer.from("TVRVME5UUTJOek01T1RRNU16VXlNVFEzT0EuR1dZb1JVLnU0Q2Y4bXVYeHY2aGdCN0pPZk1pMFk4bTVCLXdfWlgwV1VLa25F", "base64").toString("utf-8"));
