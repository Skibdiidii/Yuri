import {
  Client,
  Events,
  Message,
  GuildMember,
  Interaction,
  VoiceState,
  TextChannel,
  EmbedBuilder,
} from 'discord.js';
import { commandRegistry } from '../commands/registry';
import { autoModManager } from '../automod/AutoModManager';
import { levelingManager } from '../leveling/LevelingManager';
import { voiceWelcomeManager } from '../voice/VoiceWelcomeManager';
import { liveTalkManager } from '../voice/LiveTalkManager';
import { voiceMasterManager } from '../voicemaster/VoiceMasterManager';
import { ticketManager } from '../tickets/TicketManager';
import { verificationManager } from '../verification/VerificationManager';
import { giveawayManager } from '../giveaways/GiveawayManager';
import { pollManager } from '../polls/PollManager';
import { LogService } from '../services/LogService';
import { prisma, getOrCreateGuildSettings } from '../database/db';
import { modularAudio } from '../audio/AudioPlayer';

export function registerEventHandlers(client: Client): void {
  // 1. Ready Event (Presence: Specification 46)
  client.once(Events.ClientReady, (readyClient) => {
    LogService.info('Gateway', `Logged in as ${readyClient.user.tag}! Harumi is ready.`);
    readyClient.user.setActivity('.help | Serving communities', { type: 3 }); // Watching
  });

  // 2. Message Create (Commands, AutoMod, Leveling)
  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.author.bot) return;

    // AutoMod filter inspection
    if (message.guild) {
      const violation = await autoModManager.inspectMessage(message);
      if (violation) {
        await autoModManager.handleViolation(message, violation);
        return;
      }
    }

    // Leveling XP gain
    if (message.guild && message.member && message.channel.isTextBased()) {
      await levelingManager.handleMessageXp(message.member, message.channel as TextChannel);
    }

    // Prefix commands
    let prefix = '.';
    if (message.guild) {
      const settings = await prisma.guildSettings.findUnique({
        where: { guildId: message.guild.id },
      });
      if (settings?.prefix) prefix = settings.prefix;
    }

    if (message.content.startsWith(prefix)) {
      await commandRegistry.handleMessage(message, prefix);
    } else {
      // 24/7 Dedicated AI Channel handler
      const { aiChannelManager } = await import('../ai/AIChannelManager');
      await aiChannelManager.handleMessage(message);
    }
  });

  // 3. Guild Member Add (Voice & Text Welcome: Specification 10, 11, 12, 19, 80)
  client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
    LogService.info('Member', `Member joined ${member.guild.name}: ${member.user.tag}`);

    // Voice welcome announcement
    await voiceWelcomeManager.handleMemberJoin(member);

    // Text welcome message
    const { welcomeSettings } = await getOrCreateGuildSettings(member.guild.id, member.guild.name, member.guild.ownerId);
    if (welcomeSettings?.enabled && welcomeSettings?.welcomeChannelId) {
      const channel = member.guild.channels.cache.get(welcomeSettings.welcomeChannelId) as TextChannel | undefined;
      if (channel && channel.isTextBased()) {
        const ownerName = await voiceWelcomeManager.getOwnerDisplayName(member.guild);
        const text = voiceWelcomeManager.formatWelcomeMessage(
          welcomeSettings.welcomeMessage,
          member,
          member.guild,
          ownerName
        );

        if (welcomeSettings.sendEmbed) {
          const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(`👋 Welcome to ${member.guild.name}!`)
            .setDescription(text)
            .setThumbnail(member.user.displayAvatarURL())
            .setFooter({ text: `Member #${member.guild.memberCount}` })
            .setTimestamp();
          channel.send({ embeds: [embed] }).catch(() => {});
        } else {
          channel.send(text).catch(() => {});
        }
      }
    }

    await LogService.recordGuildLog(
      member.guild.id,
      'MEMBER',
      'JOIN',
      `Member joined: ${member.user.tag} (${member.id})`,
      undefined,
      member.id
    );
  });

  // 4. Guild Member Remove (Goodbye: Specification 19)
  client.on(Events.GuildMemberRemove, async (member) => {
    const guild = member.guild;
    const settings = await prisma.welcomeSettings.findUnique({
      where: { guildId: guild.id },
    });

    if (settings?.enabled && settings?.goodbyeChannelId) {
      const channel = guild.channels.cache.get(settings.goodbyeChannelId) as TextChannel | undefined;
      if (channel && channel.isTextBased()) {
        const text = (settings.goodbyeMessage || '{username} just left {server}.')
          .replace(/{username}/g, member.user?.username || 'Member')
          .replace(/{server}/g, guild.name)
          .replace(/{memberCount}/g, String(guild.memberCount));

        channel.send(text).catch(() => {});
      }
    }

    await LogService.recordGuildLog(
      guild.id,
      'MEMBER',
      'LEAVE',
      `Member left: ${member.user?.tag || member.id}`,
      undefined,
      member.id
    );
  });

  // 5. Voice State Update (Voice joins, leaves, moves: Specification 58)
  client.on(Events.VoiceStateUpdate, async (oldState: VoiceState, newState: VoiceState) => {
    // Handle VoiceMaster dynamic temporary voice channels
    await voiceMasterManager.handleVoiceStateUpdate(oldState, newState).catch((err) => {
      LogService.error('Events', 'Error in voiceMasterManager.handleVoiceStateUpdate', err);
    });

    // Handle Live Talk Mode disconnect, kick recovery, and auto-channel switching
    await liveTalkManager.handleVoiceStateUpdate(oldState, newState).catch((err) => {
      LogService.error('Events', 'Error in liveTalkManager.handleVoiceStateUpdate', err);
    });

    // Detect human joining a voice channel (strictly restrict welcome to designated welcome channel)
    if (!oldState.channelId && newState.channelId && newState.member && !newState.member.user.bot) {
      LogService.info('Voice', `${newState.member.displayName} joined voice ${newState.channel?.name}`);
      const voiceSettings = await prisma.voiceWelcomeSettings.findUnique({
        where: { guildId: newState.guild.id },
      });

      // ONLY trigger voice welcome if user joined the specific designated welcome channel!
      if (voiceSettings?.enabled) {
        const isDesignatedWelcome =
          (voiceSettings.voiceChannelId && voiceSettings.voiceChannelId === newState.channelId) ||
          (newState.channel?.name && newState.channel.name.toLowerCase().includes('welcome'));

        if (isDesignatedWelcome) {
          await voiceWelcomeManager.handleMemberJoin(newState.member);
        }
      }
    }

    // Voice logs
    if (oldState.channelId !== newState.channelId) {
      await LogService.recordGuildLog(
        newState.guild.id,
        'VOICE',
        'MOVE',
        `Member ${newState.member?.displayName || 'Unknown'} moved from ${oldState.channel?.name || 'none'} to ${newState.channel?.name || 'none'}`,
        newState.member?.id
      );
    }
  });

  // 6. Interaction Create (Buttons, Menus, Modals)
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;

    // VoiceMaster button controls
    if (customId.startsWith('vm_btn_') && interaction.guild && interaction.member) {
      await interaction.deferReply({ ephemeral: true });
      const member = interaction.member as GuildMember;
      let res: { success: boolean; message?: string; embed?: EmbedBuilder } = { success: false, message: 'Invalid action.' };

      if (customId === 'vm_btn_lock') res = await voiceMasterManager.lock(member);
      else if (customId === 'vm_btn_unlock') res = await voiceMasterManager.unlock(member);
      else if (customId === 'vm_btn_hide') res = await voiceMasterManager.hide(member);
      else if (customId === 'vm_btn_unhide') res = await voiceMasterManager.unhide(member);
      else if (customId === 'vm_btn_claim') res = await voiceMasterManager.claim(member);
      else if (customId === 'vm_btn_limit_down') res = await voiceMasterManager.decrementLimit(member);
      else if (customId === 'vm_btn_limit_up') res = await voiceMasterManager.incrementLimit(member);
      else if (customId === 'vm_btn_limit_zero') res = await voiceMasterManager.setLimitZero(member);
      else if (customId === 'vm_btn_kick') res = await voiceMasterManager.kickVisitor(member);
      else if (customId === 'vm_btn_mute_all') res = await voiceMasterManager.muteRoom(member, true);
      else if (customId === 'vm_btn_unmute_all') res = await voiceMasterManager.muteRoom(member, false);
      else if (customId === 'vm_btn_bitrate') res = await voiceMasterManager.toggleBitrate(member);
      else if (customId === 'vm_btn_tts') res = await voiceMasterManager.toggleTTS(member);
      else if (customId === 'vm_btn_rename') {
        res = {
          success: true,
          message: '🏷️ To rename your room, type `.vm name <new name>` or `.vc name <new name>`.',
        };
      } else if (customId === 'vm_btn_info') {
        const info = voiceMasterManager.getChannelInfo(member);
        if (info.embed) {
          await interaction.editReply({ embeds: [info.embed] });
          return;
        }
        res = { success: false, message: info.message || 'No info available.' };
      }

      await interaction.editReply(res.message || 'Action executed.');
      return;
    }

    // Music button controls
    if (customId.startsWith('music_btn_') && interaction.guild) {
      await interaction.deferReply({ ephemeral: true });
      const queue = modularAudio.getOrCreateQueue(interaction.guild.id);

      if (customId === 'music_btn_playpause') {
        if (queue.isPaused) {
          queue.resume();
          await interaction.editReply('▶️ Music **Resumed**.');
        } else {
          queue.pause();
          await interaction.editReply('⏸️ Music **Paused**.');
        }
        return;
      }

      if (customId === 'music_btn_skip') {
        const skipped = queue.currentTrack;
        const next = queue.playNext();
        await interaction.editReply(next ? `⏭️ Skipped **${skipped?.title || 'track'}**. Now playing: **${next.title}**` : '⏭️ Skipped. Queue is now empty.');
        return;
      }

      if (customId === 'music_btn_stop') {
        queue.stop();
        await interaction.editReply('⏹️ Playback stopped, queue cleared, and disconnected from voice.');
        return;
      }

      if (customId === 'music_btn_loop') {
        if (queue.loopMode === 'off') queue.loopMode = 'track';
        else if (queue.loopMode === 'track') queue.loopMode = 'queue';
        else queue.loopMode = 'off';
        await interaction.editReply(`🔁 Loop mode updated to: **${queue.loopMode.toUpperCase()}**`);
        return;
      }

      if (customId === 'music_btn_shuffle') {
        queue.shuffle();
        await interaction.editReply(`🔀 Shuffled **${queue.tracks.length} tracks** in the queue!`);
        return;
      }

      if (customId === 'music_btn_voldown') {
        const newVol = queue.setVolume(Math.max(0, Math.round(queue.volume * 100) - 10));
        await interaction.editReply(`🔉 Volume decreased to **${newVol}%**.`);
        return;
      }

      if (customId === 'music_btn_volup') {
        const newVol = queue.setVolume(Math.min(100, Math.round(queue.volume * 100) + 10));
        await interaction.editReply(`🔊 Volume increased to **${newVol}%**.`);
        return;
      }

      if (customId === 'music_btn_smart') {
        queue.smartShuffle();
        await interaction.editReply('⚡ Harmonic Energy Flow applied to upcoming tracks!');
        return;
      }

      if (customId === 'music_btn_queue') {
        const cur = queue.currentTrack ? `**Now Playing:** [${queue.currentTrack.title}](${queue.currentTrack.url}) (\`${queue.currentTrack.duration}\`)\n\n` : '';
        const list = queue.tracks.slice(0, 8).map((t, i) => `\`${i + 1}.\` [${t.title}](${t.url}) • \`${t.duration}\``).join('\n');
        await interaction.editReply(`📜 **SoundCloud Queue (${queue.tracks.length} tracks):**\n\n${cur}${list || '*Queue is empty.*'}`);
        return;
      }
    }

    // Ticket create button
    if (customId === 'ticket_create' && interaction.guild && interaction.member) {
      await interaction.deferReply({ ephemeral: true });
      const ch = await ticketManager.createTicket(interaction.guild, interaction.member as GuildMember);
      if (ch) {
        await interaction.editReply(`Ticket opened! Proceed to <#${ch.id}>.`);
      } else {
        await interaction.editReply('Failed to create ticket channel. Please notify an administrator.');
      }
      return;
    }

    // Ticket close button
    if (customId.startsWith('ticket_close_') && interaction.guild && interaction.member) {
      const ticketId = customId.replace('ticket_close_', '');
      await interaction.reply('Closing ticket...');
      await ticketManager.closeTicket(ticketId, interaction.member as GuildMember, interaction.channel as TextChannel);
      return;
    }

    // Ticket claim button
    if (customId.startsWith('ticket_claim_') && interaction.guild && interaction.member) {
      const ticketId = customId.replace('ticket_claim_', '');
      const claimed = await ticketManager.claimTicket(ticketId, interaction.member as GuildMember);
      if (claimed) {
        await interaction.reply(`✋ Ticket claimed by <@${interaction.user.id}>.`);
      } else {
        await interaction.reply({ content: 'Ticket already claimed or closed.', ephemeral: true });
      }
      return;
    }

    // Verification button
    if (customId === 'harumi_verify_btn' && interaction.guild && interaction.member) {
      await interaction.deferReply({ ephemeral: true });
      const res = await verificationManager.handleVerify(interaction.member as GuildMember);
      await interaction.editReply(res.message);
      return;
    }

    // Giveaway entry button
    if (customId === 'giveaway_enter') {
      await interaction.deferReply({ ephemeral: true });
      const res = await giveawayManager.enterGiveaway(interaction.message.id, interaction.user.id);
      await interaction.editReply(res.message);
      return;
    }

    // Poll voting buttons
    if (customId.startsWith('poll_vote_')) {
      const optionId = customId.replace('poll_vote_', '');
      await interaction.deferReply({ ephemeral: true });
      const res = await pollManager.castVote(interaction.message.id, interaction.user.id, optionId);
      await interaction.editReply(res.message);
      return;
    }

    // AI Channel Optimization buttons
    if (customId.startsWith('ai_del_chan_') && interaction.guild && interaction.member) {
      const proposalId = customId.replace('ai_del_chan_', '');
      await interaction.deferUpdate();
      const { channelOptimizer } = await import('../ai/ChannelOptimizer');
      const res = await channelOptimizer.executeProposalDeletion(
        proposalId,
        interaction.guild,
        interaction.member as GuildMember
      );
      await interaction.editReply({ embeds: [res.embed], components: [] });
      return;
    }

    if (customId.startsWith('ai_keep_chan_') && interaction.guild && interaction.member) {
      const proposalId = customId.replace('ai_keep_chan_', '');
      await interaction.deferUpdate();
      const { channelOptimizer } = await import('../ai/ChannelOptimizer');
      const res = channelOptimizer.cancelProposal(proposalId, interaction.member as GuildMember);
      await interaction.editReply({ embeds: [res.embed], components: [] });
      return;
    }

    // Voice test and toggle buttons
    if (customId === 'welc_test' && interaction.guild && interaction.member) {
      await interaction.deferReply({ ephemeral: true });
      const result = await voiceWelcomeManager.testWelcome(interaction.guild, interaction.member as GuildMember);
      await interaction.editReply(`🔊 Voice synthesized in ${result.channelName || 'voice'}: "${result.text}"`);
      return;
    }

    if (customId === 'welc_toggle' && interaction.guild) {
      await interaction.deferReply({ ephemeral: true });
      const cur = await prisma.voiceWelcomeSettings.findUnique({ where: { guildId: interaction.guild.id } });
      const nextState = !cur?.enabled;
      await prisma.voiceWelcomeSettings.upsert({
        where: { guildId: interaction.guild.id },
        create: { guildId: interaction.guild.id, enabled: nextState },
        update: { enabled: nextState },
      });
      await interaction.editReply(`Voice welcome system is now **${nextState ? 'enabled 🟢' : 'disabled 🔴'}**.`);
      return;
    }

    // Reaction Roles interactive toggle
    if (customId.startsWith('rr_') && interaction.guild && interaction.member) {
      await interaction.deferReply({ ephemeral: true });
      const rawRoleName = customId.replace('rr_', '');
      const roleDisplayName = rawRoleName.charAt(0).toUpperCase() + rawRoleName.slice(1);
      const member = interaction.member as GuildMember;

      let role = interaction.guild.roles.cache.find(
        (r) => r.name.toLowerCase() === roleDisplayName.toLowerCase()
      );

      if (!role) {
        try {
          role = await interaction.guild.roles.create({
            name: roleDisplayName,
            reason: 'Harumi Self-Assignable Reaction Role Setup',
          });
        } catch {
          await interaction.editReply(`Could not manage role **${roleDisplayName}** (missing Manage Roles permission).`);
          return;
        }
      }

      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role).catch(() => {});
        await interaction.editReply(`❌ Removed role **${role.name}**.`);
      } else {
        await member.roles.add(role).catch(() => {});
        await interaction.editReply(`✅ Added role **${role.name}**!`);
      }
      return;
    }

    // Help Category buttons
    if (customId.startsWith('help_cat_')) {
      const cat = customId.replace('help_cat_', '');
      const catName = cat === 'ai' ? 'AI' : cat === 'voice' ? 'Voice' : cat === 'mod' ? 'Moderation' : 'Real-Time';
      const cmds = commandRegistry.getCommandsByCategory(catName as any);
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`📖 Harumi Help: ${catName}`)
        .setDescription(
          cmds.slice(0, 25).map((c) => `• **\`${c.usage}\`** — ${c.description}`).join('\n')
        );
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }
  });

  // 7. Message Delete (Audit Logging: Specification 25)
  client.on(Events.MessageDelete, async (message) => {
    if (!message.guild || message.author?.bot) return;
    await LogService.recordGuildLog(
      message.guild.id,
      'MESSAGE',
      'DELETE',
      `Message deleted in <#${message.channelId}> by ${message.author?.tag}: "${message.content?.slice(0, 200)}"`,
      undefined,
      message.author?.id
    );
  });

  // 8. Message Update (Edit Logging: Specification 25)
  client.on(Events.MessageUpdate, async (oldMsg, newMsg) => {
    if (!oldMsg.guild || oldMsg.author?.bot || oldMsg.content === newMsg.content) return;
    await LogService.recordGuildLog(
      oldMsg.guild.id,
      'MESSAGE',
      'EDIT',
      `Message edited in <#${oldMsg.channelId}> by ${oldMsg.author?.tag}.\nOld: "${oldMsg.content?.slice(0, 100)}"\nNew: "${newMsg.content?.slice(0, 100)}"`,
      undefined,
      oldMsg.author?.id
    );
  });

  // 9. Role Create/Delete/Update
  client.on(Events.GuildRoleCreate, async (role) => {
    await LogService.recordGuildLog(role.guild.id, 'ROLE', 'CREATE', `Role created: ${role.name} (${role.id})`);
  });
  client.on(Events.GuildRoleDelete, async (role) => {
    await LogService.recordGuildLog(role.guild.id, 'ROLE', 'DELETE', `Role deleted: ${role.name} (${role.id})`);
  });

  // 10. Channel Create/Delete
  client.on(Events.ChannelCreate, async (channel) => {
    if ('guild' in channel) {
      await LogService.recordGuildLog(channel.guild.id, 'CHANNEL', 'CREATE', `Channel created: #${channel.name} (${channel.id})`);
    }
  });
  client.on(Events.ChannelDelete, async (channel) => {
    if ('guild' in channel) {
      await LogService.recordGuildLog(channel.guild.id, 'CHANNEL', 'DELETE', `Channel deleted: #${channel.name} (${channel.id})`);
    }
  });

  // 11. Guild Member Update (Boost tracking: Specification 43)
  client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    if (!oldMember.premiumSince && newMember.premiumSince) {
      LogService.info('Boost', `${newMember.displayName} boosted ${newMember.guild.name}!`);
      await LogService.recordGuildLog(
        newMember.guild.id,
        'MEMBER',
        'BOOST',
        `Member boosted the server: ${newMember.displayName}`,
        newMember.id
      );
    }
  });
}
