#!/bin/bash
sed -i 's/15_000/60_000/g' node_modules/discord.js-selfbot-v13/src/client/voice/VoiceConnection.js
sed -i 's/15 seconds/60 seconds/g' node_modules/discord.js-selfbot-v13/src/errors/Messages.js
