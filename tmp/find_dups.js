const fs = require("fs");
const content = fs.readFileSync("server.ts", "utf8");
const rx = /if \(command === "(.*?)"/g;
const counts = {};
let match;
while(match = rx.exec(content)) { counts[match[1]] = (counts[match[1]]||0)+1; }
for (let key in counts) { if (counts[key] > 1) console.log(key); }
