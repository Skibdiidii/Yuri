#!/bin/bash
sed -i 's/15_000/60_000/g' node_modules/discord.js-selfbot-v13/src/client/voice/VoiceConnection.js 2>/dev/null || true
sed -i 's/15 seconds/60 seconds/g' node_modules/discord.js-selfbot-v13/src/errors/Messages.js 2>/dev/null || true

node -e "
const fs = require('fs');
const path = require('path');
const p = path.join(process.cwd(), 'node_modules/@gabrielmaialva33/discord-video-stream/dist/src/media/new_api.js');
if (fs.existsSync(p)) {
  let code = fs.readFileSync(p, 'utf8');
  code = code.replace(/import sharp from ['\"]sharp['\"];?/, 'const sharp = (buf, opts) => ({ resize: () => ({ jpeg: () => ({ toBuffer: async () => Buffer.from([]) }) }), jpeg: () => ({ toBuffer: async () => Buffer.from([]) }) });');
  fs.writeFileSync(p, code);
}
" 2>/dev/null || true
