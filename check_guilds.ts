import { Client, GatewayIntentBits } from 'discord.js';

async function check(token: string) {
  return new Promise((resolve) => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    client.on('ready', () => {
      console.log(`Bot ${client.user?.tag} is in ${client.guilds.cache.size} guilds:`);
      client.guilds.cache.forEach(g => console.log(` - ${g.name} (${g.id})`));
      client.destroy();
      resolve(true);
    });
    client.login(Buffer.from(token, "base64").toString("utf-8"));
  });
}

async function run() {
  await check("TVRVME5UUTJOek01T1RRNU16VXlNVFEzT0EuR1dZb1JVLnU0Q2Y4bXVYeHY2aGdCN0pPZk1pMFk4bTVCLXdfWlgwV1VLa25F");
  await check("TVRRNU1EY3pNVEl6T1RneE1UQTFPVGN5TXcuR0kyeU5PLkdFTFZFVng4T1BtZ1FsMzJSbHBPTnFOdzBTcGFBSGp1TkdQSHM0");
}
run();
