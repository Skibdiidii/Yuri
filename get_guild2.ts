import fetch from 'node-fetch';

async function checkInvite() {
  const token = Buffer.from("TVRRNU1EY3pNVEl6T1RneE1UQTFPVGN5TXcuR0kyeU5PLkdFTFZFVng4T1BtZ1FsMzJSbHBPTnFOdzBTcGFBSGp1TkdQSHM0", "base64").toString("utf-8");
  
  // Try to use the bot to check if we can get ANY info about the guild
  const res = await fetch('https://discord.com/api/v10/guilds/1545400179379806218', {
    headers: { Authorization: `Bot ${token}` }
  });
  
  console.log("Status:", res.status);
  const data = await res.json();
  console.log(data);
}

checkInvite();
