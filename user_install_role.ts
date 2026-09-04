import fetch from 'node-fetch';

async function checkUserInstallStatus() {
  const token = Buffer.from("TVRVME5UUTJOek01T1RRNU16VXlNVFEzT0EuR1dZb1JVLnU0Q2Y4bXVYeHY2aGdCN0pPZk1pMFk4bTVCLXdfWlgwV1VLa25F", "base64").toString("utf-8");
  
  const res = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bot ${token}` }
  });
  
  const botInfo = await res.json();
  console.log("Bot Info:", botInfo);
}

checkUserInstallStatus();
