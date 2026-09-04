import fs from 'fs';
import path from 'path';

async function tryFindTokens() {
    try {
        console.log("Searching for tokens anywhere in the project...");
        const output = require('child_process').execSync('grep -rn "MT[A-Za-z0-9_-]\\{20,\\}\\.[A-Za-z0-9_-]\\{6\\}\\.[A-Za-z0-9_-]\\{27,\\}" .', { encoding: 'utf-8' });
        console.log(output.substring(0, 500));
    } catch (e) {
        console.log("No raw tokens found via regex grep.");
    }
}
tryFindTokens();
