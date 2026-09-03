# Project API Documentation

## Endpoints

### Raw Script Execution
- **Endpoints**: `GET /catalystcord.lua` or `GET /raw/catalystcord.lua`
- **Description**: Returns the raw `catalystcord.lua` Roblox script for `loadstring(game:HttpGet(...))()`.
- **Response**: Raw Lua script content (`text/plain`).

### Script Execution
- **Endpoint**: `POST /api/script/execute`
- **Headers**: `Authorization: <token>`
- **Body**: `{ "script": "string" }`
- **Response**: `{ "success": true, "message": "Executed", "script": "..." }`

### Command List
- **Endpoint**: `GET /api/commands`
- **Headers**: `Authorization: <token>`
- **Response**:
```json
{
  "commands": [
    { "name": "setstatus", "description": "Set rich presence status" },
    { "name": "joinvc", "description": "Join voice channel" },
    { "name": "stream", "description": "Start camera/screen stream in VC" },
    ...
  ]
}
```

### Authentication
- **Endpoint**: `POST /api/auth/extract-token`
- **Body**: `{ "email": "string", "password": "string" }`
- **Response**: `{ "success": true, "token": "string" }`

### Voice Channel Join
- **Endpoint**: `POST /api/actions/vc/join`
- **Headers**: `Authorization: <token>`
- **Body**: `{ "channelId": "string" }`
- **Response**: `{ "success": true }`

### Soundboard Play
- **Endpoint**: `POST /api/actions/vc/soundboard/play`
- **Headers**: `Authorization: <token>`
- **Body**: `{ "soundId": "string" }`
- **Response**: `{ "success": true }`

### Soundboard Sounds List
- **Endpoint**: `GET /api/actions/vc/soundboard/sounds`
- **Headers**: `Authorization: <token>`
- **Response**: `[ { "id": "1", "name": "Quack", "emoji": "🔊" }, ... ]`

### Discord API Proxy
- **Endpoints**: 
  - `ALL /api/catalystcord/proxy?url=<url>`
  - `ALL /api/yuricord/proxy?url=<url>`
- **Headers**: `Authorization: <token>`
- **Response**: Forwarded response body from Discord REST API

### User Profile & Display Names
- **User Profile Fetch**: `GET /api/yuricord/proxy?url=https://discord.com/api/v10/users/<userId>`
- **Direct Message Creation**: `POST /api/yuricord/proxy?url=https://discord.com/api/v10/users/@me/channels`
- **Features Added**:
  - Full Discord User Profile Modal (Displays Avatar, Display Name, Username/Handle, User ID, About Me/Bio, Bot Badges, Copy ID button, and Direct Message button).
  - Display Name Resolution (supports Guild Nicknames `member.nick`, Global Display Names `global_name`, and `@username` fallback).
  - Interactive profile viewing by clicking user avatars or usernames in messages.
  - Smart Chat Scrolling with automatic scroll height detection and "⬇️ Jump to Bottom" floating control.

### Rich Presence (RPC) Update
- **Endpoint**: `POST /api/rpc/update`
- **Headers**: `Authorization: <token>`
- **Body**: `{ "configs": [ { "name": "string", "details": "string", "state": "string", "type": "PLAYING" } ], "selectedIndex": 0 }`
- **Response**: `{ "success": true }`

### Discord Markdown Formatting & Mentions
- **Supported Markdown Syntaxes**:
  - Headers: `# Header 1`, `## Header 2`, `### Header 3`
  - Text Styles: `**bold**`, `*italic*`, `_italic_`, `~~strikethrough~~`, `__underline__`, `***bold italic***`
  - Quotes & Code: `> Blockquote`, `` `Inline Code` ``, ` ```Code Block``` `, `||Spoiler||`
  - Mentions & Tags: `@everyone`, `@here`, `@username`
- **Interactive Mention Autocomplete**: Typing `@` in chat input triggers live pop-up selector for `@everyone`, `@here`, and member tags.

### Media & Imgur Integration
- **Imgur Image Upload**: `POST https://api.imgur.com/3/image`
- **Headers**: `Authorization: Client-ID <clientId>`
- **Body**: `{ "image": "<url_or_base64>", "type": "url" }`
- **Response**: `{ "data": { "link": "https://i.imgur.com/..." }, "success": true }`

## Important Usage Note
When using these endpoints from external scripts (e.g. Roblox, Lua), you **MUST** use the **Shared App URL** (the one starting with `ais-pre-`) instead of the Development URL. The Development URL is protected by Google Authentication and will return an HTML sign-in page instead of JSON.

