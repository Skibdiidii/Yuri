import fetch from 'node-fetch';

async function checkInvite() {
  const token = Buffer.from("TVRVME5UUTJOek01T1RRNU16VXlNVFEzT0EuR1dZb1JVLnU0Q2Y4bXVYeHY2aGdCN0pPZk1pMFk4bTVCLXdfWlgwV1VLa25F", "base64").toString("utf-8");
  
  // Try to use the bot to check if we can get ANY info about the guild
  const res = await fetch('https://discord.com/api/v10/guilds/1545400179379806218', {
    headers: { Authorization: `Bot ${token}` }
  });
  
  console.log("Status:", res.status);
  const data = await res.json();
  console.log(data);
}

checkInvite();
