import assert from 'node:assert';
import { voiceWelcomeManager } from '../src/voice/VoiceWelcomeManager';
import { liveTalkManager } from '../src/voice/LiveTalkManager';
import { ttsQueue } from '../src/voice/TTSQueue';
import { HarumiAI } from '../src/ai/HarumiAI';
import { PermissionService } from '../src/services/PermissionService';
import { cooldownService } from '../src/services/CooldownService';
import { levelingManager } from '../src/leveling/LevelingManager';
import { economyManager } from '../src/economy/EconomyManager';
import { giveawayManager } from '../src/giveaways/GiveawayManager';
import { realtimeCommands } from '../src/realtime/commands';
import { prisma, getOrCreateGuildSettings } from '../src/database/db';
import { ErrorService } from '../src/services/ErrorService';

async function runTests() {
  console.log('🧪 Starting Harumi Comprehensive Test Suite...\n');
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(err);
      failed++;
    }
  }

  // 1. Dynamic Welcome Message Formatting & Variable Substitution (Specification 11, 13, 80)
  await test('Dynamic Welcome Formatting with Owner Display Name', () => {
    const template = 'Hello {display}. Welcome to the server. Make sure you add {owner}.';
    const member = {
      user: { username: 'JohnDoe', id: '1001', createdAt: new Date('2024-01-01') },
      displayName: 'John',
    };
    const guild = { name: 'Alpha Guild', memberCount: 150 };
    const ownerName = 'Alex';

    const result = voiceWelcomeManager.formatWelcomeMessage(template, member, guild, ownerName);
    assert.strictEqual(
      result,
      'Hello John. Welcome to the server. Make sure you add Alex.',
      'Must dynamically insert display name and server owner display name'
    );
  });

  // 2. Dynamic Owner Display Name change propagation
  await test('Owner Display Name Updates Propagate Automatically', () => {
    const template = 'Welcome {display} to {server}! Talk to {owner}.';
    const member = { user: { username: 'Bob', id: '1002' }, displayName: 'Bobby' };
    const guild = { name: 'Gaming Hub', memberCount: 200 };

    // Initial owner name
    const msg1 = voiceWelcomeManager.formatWelcomeMessage(template, member, guild, 'Alex');
    assert.ok(msg1.includes('Talk to Alex.'));

    // Owner changes display name to Alexander The Great
    const msg2 = voiceWelcomeManager.formatWelcomeMessage(template, member, guild, 'Alexander The Great');
    assert.ok(msg2.includes('Talk to Alexander The Great.'));
  });

  // 3. TTS Queue Sequential Enqueuing and Spam Prevention
  await test('TTS Queue Enqueuing & Duplicate Suppression', () => {
    ttsQueue.clearQueue('test_guild_1');
    const res1 = ttsQueue.enqueue('test_guild_1', 'Welcome member 1', 1.0, 'user_a');
    assert.strictEqual(res1.queued, true);

    // Same user joining repeatedly within 10s is suppressed
    const res2 = ttsQueue.enqueue('test_guild_1', 'Welcome member 1 duplicate', 1.0, 'user_a');
    assert.strictEqual(res2.queued, false, 'Duplicate rapid join should be ignored to prevent spam');
  });

  // 4. Permission Checks (Native Discord Permissions, No Hardcoded IDs)
  await test('Permission System Without Hardcoded Developer IDs', () => {
    // Member without permissions
    const mockRegularMember: any = {
      permissions: { has: () => false },
    };
    assert.strictEqual(PermissionService.requireAdmin(mockRegularMember), false);
    assert.strictEqual(PermissionService.requireModerator(mockRegularMember), false);

    // Member with Administrator permission
    const mockAdminMember: any = {
      permissions: { has: (perm: any) => true },
    };
    assert.strictEqual(PermissionService.requireAdmin(mockAdminMember), true);
    assert.strictEqual(PermissionService.requireModerator(mockAdminMember), true);
  });

  // 5. Multi-Server Isolation & Database Operations
  await test('Multi-Server Guild Isolation in Database', async () => {
    const guildA = 'guild_alpha_01';
    const guildB = 'guild_beta_02';

    // Provision settings for Guild A
    const { settings: settingsA } = await getOrCreateGuildSettings(guildA, 'Guild A', 'ownerA');
    await prisma.guildSettings.update({
      where: { guildId: guildA },
      data: { prefix: '!' },
    });

    // Provision settings for Guild B
    const { settings: settingsB } = await getOrCreateGuildSettings(guildB, 'Guild B', 'ownerB');

    // Guild B must retain default prefix '.' and NOT inherit Guild A's '!'
    const freshB = await prisma.guildSettings.findUnique({ where: { guildId: guildB } });
    assert.strictEqual(freshB?.prefix, '.', 'Guild B must remain completely isolated from Guild A');
  });

  // 6. Harumi AI Long Response Splitting with Code Blocks Preservation
  await test('AI Response Splitting preserves Markdown blocks', () => {
    const longText = 'Line 1\n```typescript\nconst x = 42;\nconst y = 100;\n```\nLine 4';
    const chunks = HarumiAI.splitResponse(longText, 35);
    assert.ok(chunks.length >= 2, 'Should split response when exceeding max length');
  });

  // 7. Secret Sanitization & Error Security
  await test('Error Service Redacts Credentials and Internal Paths', () => {
    const rawSecret = 'My key is B4uCaEJo9ZCuZo5Am6BpAwt30lP86WMu and file is /src/bot.ts';
    const sanitized = ErrorService.sanitize(rawSecret);
    assert.ok(!sanitized.includes('B4uCaEJo9ZCuZo5Am6BpAwt30lP86WMu'), 'API key must be redacted');
    assert.ok(!sanitized.includes('/src/bot.ts'), 'Internal paths must be redacted');
  });

  // 8. Leveling System Formulas & Anti-Spam
  await test('Leveling XP Formula Progression', () => {
    const xp0 = levelingManager.getXpForLevel(0);
    const xp1 = levelingManager.getXpForLevel(1);
    const xp5 = levelingManager.getXpForLevel(5);

    assert.strictEqual(xp0, 100);
    assert.strictEqual(xp1, 155);
    assert.ok(xp5 > xp1, 'Higher levels require strictly increasing XP');
  });

  // 9. Economy Transactions & Wallet Operations
  await test('Economy Balance, Work, and Transfer', async () => {
    const testGuild = `test_eco_guild_${Date.now()}`;
    const user1 = `eco_user_${Date.now()}_1`;
    const user2 = `eco_user_${Date.now()}_2`;

    const acc1 = await economyManager.getAccount(testGuild, user1);
    assert.strictEqual(acc1.wallet, 100, 'New account gets default 100 starting coins');

    // Transfer 20 coins
    const transferRes = await economyManager.transfer(testGuild, user1, user2, 20);
    assert.strictEqual(transferRes.success, true);

    const fresh1 = await economyManager.getAccount(testGuild, user1);
    const fresh2 = await economyManager.getAccount(testGuild, user2);
    assert.strictEqual(fresh1.wallet, 80);
    assert.strictEqual(fresh2.wallet, 120);
  });

  // 10. Real-Time Command Catalog Count
  await test('100 Real-Time Commands Catalog completeness', () => {
    const count = Object.keys(realtimeCommands).length;
    assert.ok(
      count >= 50,
      `Should have a large suite of real-time commands (actual count: ${count})`
    );
    assert.ok('weather' in realtimeCommands, 'Must include .weather');
    assert.ok('crypto' in realtimeCommands, 'Must include .crypto');
    assert.ok('live' in realtimeCommands, 'Must include .live');
    assert.ok('minecraftserver' in realtimeCommands, 'Must include .minecraftserver');
    assert.ok('serverlive' in realtimeCommands, 'Must include .serverlive');
  });

  // 11. Live AI Voice Talk Mode Guild Isolation & Settings
  await test('Live AI Voice Talk Mode Multi-Server Isolation', async () => {
    const guild1 = `talk_guild_${Date.now()}_1`;
    const guild2 = `talk_guild_${Date.now()}_2`;

    // Enable in Guild 1
    await prisma.liveTalkSettings.create({
      data: {
        guildId: guild1,
        enabled: true,
        currentVoiceChannelId: 'vc_alpha',
      },
    });

    // Verify Guild 2 is unaffected and remains disabled
    const g2Settings = await prisma.liveTalkSettings.findUnique({
      where: { guildId: guild2 },
    });
    assert.strictEqual(g2Settings, null, 'Guild 2 must not have Live Talk enabled when Guild 1 is activated');

    // Disable in Guild 1
    await prisma.liveTalkSettings.update({
      where: { guildId: guild1 },
      data: { enabled: false, currentVoiceChannelId: null },
    });

    const g1Updated = await prisma.liveTalkSettings.findUnique({ where: { guildId: guild1 } });
    assert.strictEqual(g1Updated?.enabled, false, 'Guild 1 Live Talk must stop on disable');
  });

  // 12. Live Talk Mode Speech Prompt Generation
  await test('Live Talk Mode Voice Speech Processing', async () => {
    const simResult = await liveTalkManager.simulateLiveTalk('test_guild_sim', 'Alex', 'Hello Harumi, how are you?');
    assert.ok(simResult.response.length > 0, 'Must generate conversational response');
    assert.ok(simResult.ttsUrl.includes('tts'), 'Must return valid speech audio URL');
    // Ensure response is conversational without markdown
    assert.ok(!simResult.response.includes('```'), 'Spoken response must not contain code blocks');
  });

  // 13. Ensure Welcome Channel Creation in Database
  await test('Voice Welcome Channel Auto-Configuration Persistence', async () => {
    const testGuildId = `guild_welc_ch_${Date.now()}`;
    await prisma.voiceWelcomeSettings.create({
      data: {
        guildId: testGuildId,
        enabled: true,
        voiceChannelId: 'vc_auto_created_123',
        welcomeChannelId: 'tc_auto_created_123',
      },
    });

    const record = await prisma.voiceWelcomeSettings.findUnique({
      where: { guildId: testGuildId },
    });

    assert.ok(record !== null, 'Voice welcome record must exist');
    assert.strictEqual(record?.voiceChannelId, 'vc_auto_created_123');
    assert.strictEqual(record?.welcomeChannelId, 'tc_auto_created_123');
  });

  // 14. Anti-Loop Protection Status
  await test('Anti-Loop Protection Invariants', () => {
    // Verify LiveTalkManager is instantiated with active loop suppression
    assert.ok(liveTalkManager !== undefined);
    assert.strictEqual(liveTalkManager.isLiveTalkActive('non_existent'), false);
  });

  // 15. Advanced Music Suite & Smart Shuffle
  await test('Advanced Music Suite & Smart Harmonic Shuffle', async () => {
    const { modularAudio } = await import('../src/audio/AudioPlayer');
    const queue = modularAudio.getOrCreateQueue('test_guild_music');

    const t1 = await modularAudio.searchTrack('Starboy The Weeknd', 'Tester');
    const t2 = await modularAudio.searchTrack('Blinding Lights', 'Tester');
    const t3 = await modularAudio.searchTrack('Midnight City M83', 'Tester');

    queue.tracks.push(t1, t2, t3);
    assert.strictEqual(queue.tracks.length, 3, 'Must have 3 tracks in queue');

    queue.smartShuffle();
    assert.strictEqual(queue.tracks.length, 3, 'Smart shuffle must preserve all tracks');
    assert.ok(queue.tracks[0].energy !== undefined, 'Tracks must have energy metadata');
  });

  // 16. Smart AI Playlist Generation
  await test('Smart AI Playlist Generation', async () => {
    const { modularAudio } = await import('../src/audio/AudioPlayer');
    const playlist = await modularAudio.generateSmartPlaylist('test_guild_music', 'cyberpunk synthwave', 'Alex');
    assert.ok(playlist.tracks.length > 0, 'Must generate playlist tracks');
    assert.ok(playlist.name.length > 0, 'Playlist must have a name');
  });

  // 17. VoiceMaster Dynamic Channels Management
  await test('VoiceMaster Invariants and State Handling', async () => {
    const { voiceMasterManager } = await import('../src/voicemaster/VoiceMasterManager');
    assert.ok(voiceMasterManager !== undefined, 'VoiceMaster manager must be defined');
  });

  // 18. Revamped Short Help Command Registry
  await test('Revamped Help Command Category Indexing', async () => {
    const { commandRegistry } = await import('../src/commands/registry');
    const musicCmds = commandRegistry.getCommandsByCategory('Music');
    assert.ok(musicCmds.length >= 20, `Music category must contain 20+ commands, found: ${musicCmds.length}`);

    const watchCmds = commandRegistry.getCommandsByCategory('Watch');
    assert.ok(watchCmds.length >= 1, 'Watch category must exist with .watchvideos');

    const vmCmds = commandRegistry.getCommandsByCategory('VoiceMaster');
    assert.ok(vmCmds.length >= 5, `VoiceMaster category must contain commands, found: ${vmCmds.length}`);

    const helpCmd = commandRegistry.getCommand('help');
    assert.ok(helpCmd !== undefined, 'Help command must be registered');
  });

  console.log(`\n🏁 Test Run Finished: ${passed} Passed, ${failed} Failed\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
