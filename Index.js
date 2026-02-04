require('dotenv').config();
const http = require('http');
const { 
  Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder, 
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType,
  REST, Routes, SlashCommandBuilder 
} = require('discord.js');

// Railway Health Check
http.createServer((req, res) => res.end('Arctic Customs Utility Online')).listen(process.env.PORT || 3000);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages]
});

// ================= CONFIGURATION =================
const CONFIG = {
  colors: { primary: 0x9cd8ff, red: 0xff0000, green: 0x00ff00, orange: 0xffa500 },
  roles: {
    employee: '1466986951008587968',
    manager: '1468710579618185278',
    hr: 'YOUR_HR_ROLE_ID', // Replace
  },
  categories: { tickets: '1467262468379115522' },
  logs: {
    tickets: '1467264765033320706',
    punishments: '1467302915659272406',
    staff_activity: 'YOUR_STAFF_LOG_ID' // Replace
  }
};

// ================= SLASH COMMANDS =================
const commands = [
  // Setup Command
  new SlashCommandBuilder().setName('setup-hub').setDescription('Deploy Ticket & Application Hub'),
  
  // Staff Management
  new SlashCommandBuilder().setName('warn').setDescription('Warn a user')
    .addUserOption(o => o.setName('user').setDescription('Target').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true)),
    
  new SlashCommandBuilder().setName('ban').setDescription('Ban a user')
    .addUserOption(o => o.setName('user').setDescription('Target').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true)),

  new SlashCommandBuilder().setName('kick').setDescription('Kick a user')
    .addUserOption(o => o.setName('user').setDescription('Target').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true)),

  new SlashCommandBuilder().setName('promote').setDescription('Promote an employee')
    .addUserOption(o => o.setName('user').setDescription('Employee').setRequired(true))
    .addStringOption(o => o.setName('new_role').setDescription('New Rank Title').setRequired(true)),

  new SlashCommandBuilder().setName('resign').setDescription('Process a resignation')
    .addUserOption(o => o.setName('user').setDescription('Employee').setRequired(true))
].map(c => c.toJSON());

// ================= LOGIC HANDLERS =================

client.once('ready', async () => {
  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
  console.log('❄️ Arctic Customs Utility Ready');
});

client.on('interactionCreate', async interaction => {
  // 1. SLASH COMMANDS
  if (interaction.isChatInputCommand()) {
    const { commandName, options, guild } = interaction;

    // Permissions Check for Staff Commands
    if (['warn', 'ban', 'kick', 'promote', 'resign'].includes(commandName)) {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return interaction.reply({ content: '❌ Staff only.', ephemeral: true });
      }
    }

    if (commandName === 'setup-hub') {
      const embed = new EmbedBuilder()
        .setTitle('Arctic Customs | Support & Careers')
        .setDescription('Select the appropriate button below to open a ticket or apply for a position.')
        .setColor(CONFIG.colors.primary);

      const ticketRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('t_design').setLabel('Design Ticket').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('t_support').setLabel('General Support').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('t_affil').setLabel('Affiliation').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('t_hr').setLabel('HR Ticket').setStyle(ButtonStyle.Danger)
      );

      const appRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('app_designer').setLabel('Apply: Designer').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('app_employee').setLabel('Apply: Employee').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('app_hr').setLabel('Apply: Higher Rank').setStyle(ButtonStyle.Danger)
      );

      await interaction.reply({ embeds: [embed], components: [ticketRow, appRow] });
    }

    if (commandName === 'warn') {
      const user = options.getUser('user');
      const reason = options.getString('reason');
      const logEmbed = new EmbedBuilder().setTitle('⚠️ Infraction: Warning').addFields({name: 'User', value: `${user}`}, {name: 'Reason', value: reason}, {name: 'Moderator', value: `${interaction.user}`}).setColor(CONFIG.colors.orange);
      await client.channels.cache.get(CONFIG.logs.punishments).send({ embeds: [logEmbed] });
      await interaction.reply(`✅ Warned ${user}.`);
    }

    if (commandName === 'promote') {
      const user = options.getUser('user');
      const rank = options.getString('new_role');
      const logEmbed = new EmbedBuilder().setTitle('📈 Promotion').setDescription(`${user} has been promoted to **${rank}**!`).setAuthor({ name: interaction.user.tag }).setColor(CONFIG.colors.green);
      await client.channels.cache.get(CONFIG.logs.staff_activity).send({ embeds: [logEmbed] });
      await interaction.reply(`✅ Promoted ${user} to ${rank}.`);
    }
  }

  // 2. BUTTONS (Tickets & Apps)
  if (interaction.isButton()) {
    const isApp = interaction.customId.startsWith('app_');
    const isTicket = interaction.customId.startsWith('t_');

    if (isApp || isTicket) {
      await interaction.deferReply({ ephemeral: true });
      const typeLabel = interaction.customId.replace('t_', '').replace('app_', '').replace('_', ' ');
      
      const channel = await interaction.guild.channels.create({
        name: `${interaction.customId}-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: CONFIG.categories.tickets,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: CONFIG.roles.employee, allow: [PermissionsBitField.Flags.ViewChannel] }
        ]
      });

      const welcomeEmbed = new EmbedBuilder()
        .setTitle(`${isApp ? 'Application' : 'Ticket'}: ${typeLabel.toUpperCase()}`)
        .setDescription(`Hello <@${interaction.user.id}>, staff will be with you shortly. Please provide all necessary details.`)
        .setColor(CONFIG.colors.primary);

      const closeBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger)
      );

      await channel.send({ content: `<@${interaction.user.id}>`, embeds: [welcomeEmbed], components: [closeBtn] });
      await interaction.editReply(`Opened: ${channel}`);
    }

    if (interaction.customId === 'close_ticket') {
      await interaction.reply('🔒 Archive in progress... Closing in 5s.');
      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
  }
});

client.login(process.env.BOT_TOKEN);
