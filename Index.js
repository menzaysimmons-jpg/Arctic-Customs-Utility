// ===============================
// Arctic Customs – Core Bot File
// discord.js v14
// ===============================

require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} = require('discord.js');

// ================= CLIENT =================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// ================= CONFIG =================
// ⚠️ REPLACE ALL IDS WITH REAL ONES

const config = {
  colors: { primary: 0x9cd8ff },

  roles: {
    employee: '1466986951008587968',
    manager: '1468710579618185278'
  },

  categories: {
    tickets: '1467262468379115522'
  },

  logs: {
    tickets: '1467264765033320706',
    punishments: '1467302915659272406'
  }
};

// ================= UTIL =================

function sanitizeChannelName(username, id) {
  return `ticket-${username}-${id}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 90);
}

async function logToChannel(guild, channelId, embed) {
  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;
  channel.send({ embeds: [embed] }).catch(() => {});
}

// ================= READY =================

client.once('ready', () => {
  console.log(`❄️ Arctic Customs Bot loaded as ${client.user.tag}`);
});

// ================= INTERACTIONS =================

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  // =====================================================
  // OPEN TICKET
  // =====================================================
  if (interaction.customId === 'open_ticket') {
    try {
      await interaction.deferReply({ ephemeral: true });

      const guild = interaction.guild;
      const member = await guild.members.fetch(interaction.user.id);
      const botMember = guild.members.me;

      if (!botMember.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return interaction.editReply('❌ I need **Manage Channels** permission.');
      }

      if (!config.categories.tickets) {
        return interaction.editReply('❌ Ticket category not configured.');
      }

      const channelName = sanitizeChannelName(
        interaction.user.username,
        interaction.user.id
      );

      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: config.categories.tickets,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages
            ]
          },
          {
            id: config.roles.employee,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages
            ]
          }
        ]
      });

      const embed = new EmbedBuilder()
        .setTitle('🎟️ Arctic Customs Ticket')
        .setDescription(
          'Please describe your request.\nAn employee will assist you shortly.'
        )
        .setColor(config.colors.primary);

      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({
        content: `<@${interaction.user.id}>`,
        embeds: [embed],
        components: [closeRow]
      });

      const logEmbed = new EmbedBuilder()
        .setTitle('📂 Ticket Created')
        .setDescription(`User: <@${interaction.user.id}>\nChannel: ${channel}`)
        .setColor(config.colors.primary)
        .setTimestamp();

      await logToChannel(guild, config.logs.tickets, logEmbed);

      await interaction.editReply(`✅ Ticket created: ${channel}`);

    } catch (err) {
      console.error('Ticket Creation Error:', err);
      if (interaction.deferred)
        interaction.editReply('❌ Failed to create ticket.');
    }
  }

  // =====================================================
  // CLOSE TICKET
  // =====================================================
  if (interaction.customId === 'close_ticket') {
    try {
      const channel = interaction.channel;
      const guild = interaction.guild;

      if (!channel.name.startsWith('ticket-')) {
        return interaction.reply({
          content: '❌ This is not a ticket channel.',
          ephemeral: true
        });
      }

      await interaction.reply('🔒 Closing ticket in 5 seconds...');

      const logEmbed = new EmbedBuilder()
        .setTitle('📁 Ticket Closed')
        .setDescription(`Channel: ${channel.name}`)
        .setColor(0xff4d4d)
        .setTimestamp();

      await logToChannel(guild, config.logs.tickets, logEmbed);

      setTimeout(() => {
        channel.delete().catch(() => {});
      }, 5000);

    } catch (err) {
      console.error('Ticket Close Error:', err);
    }
  }

  // =====================================================
  // ACCEPT CONTRACT
  // =====================================================
  if (interaction.customId === 'accept_contract') {
    try {
      await interaction.deferReply({ ephemeral: true });

      const guild = interaction.guild;
      const member = await guild.members.fetch(interaction.user.id);
      const botMember = guild.members.me;

      if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return interaction.editReply('❌ I need **Manage Roles** permission.');
      }

      const role = guild.roles.cache.get(config.roles.employee);
      if (!role) {
        return interaction.editReply('❌ Employee role not found.');
      }

      if (botMember.roles.highest.position <= role.position) {
        return interaction.editReply(
          '❌ My role must be higher than the employee role.'
        );
      }

      await member.roles.add(role);

      const embed = new EmbedBuilder()
        .setTitle('📄 Contract Accepted')
        .setDescription(`Welcome to Arctic Customs, <@${member.id}>!`)
        .setColor(config.colors.primary)
        .setTimestamp();

      await logToChannel(guild, config.logs.punishments, embed);

      await interaction.editReply('✅ Contract accepted.');

    } catch (err) {
      console.error('Contract Error:', err);
      if (interaction.deferred)
        interaction.editReply('❌ Failed to accept contract.');
    }
  }
});

// ================= GLOBAL ERROR HANDLERS =================

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
  console.error('Uncaught exception:', error);
});

// ================= LOGIN =================

client.login(process.env.BOT_TOKEN);
