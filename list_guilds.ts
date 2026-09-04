import fetch from 'node-fetch';

async function listGuilds(token: string, name: string) {
  const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
    headers: { Authorization: `Bot ${token}` }
  });
  if (res.ok) {
    const guilds = await res.json();
    console.log(`Guilds for ${name}:`, guilds);
  } else {
    console.log(`Error for ${name}:`, await res.text());
  }
}

async function run() {
  await listGuilds(Buffer.from("TVRRNU1EY3pNVEl6T1RneE1UQTFPVGN5TXcuR0kyeU5PLkdFTFZFVng4T1BtZ1FsMzJSbHBPTnFOdzBTcGFBSGp1TkdQSHM0", "base64").toString("utf-8"), "Yuri Bot");
}
run();
