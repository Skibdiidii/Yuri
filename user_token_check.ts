import fetch from 'node-fetch';

async function checkUserToken() {
  // If the Russian bot was given user tokens or authorized via OAuth, we need to check if we have the user's OAuth token
  // Let's check the database or session to see if we have an OAuth token for the user 1545521054930436167
  console.log("We need to use the Discord API with a bot that is ACTUALLY in the server.");
  console.log("If the server owner is terminated, and the bot is not in the server, the server is essentially orphaned.");
}

checkUserToken();
