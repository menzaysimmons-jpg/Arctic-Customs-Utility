require('dotenv').config();
const http = require('http'); // Required for Railway Health Checks
const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  REST,
  Routes,
  SlashCommandBuilder
} = require('discord.js');

// ================= RAILWAY KEEP-ALIVE =================
// Railway needs a web port to stay active.
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Arctic Customs Utility is Operational');
}).listen(process.env.PORT || 3000);

// ================= CLIENT SETUP =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
});

const config = {
  colors: { primary: 0x9cd8ff, success: 0x00FF00, danger: 0xFF4D4D },
  roles: { employee: '1466986951008587968', manager: '1468710579618185278' },
  categories: { tickets: '1467262468379115522' },
  logs: { tickets: '1467264765033320706', punishments: '1467302915659272406' }
};

// ================= SLASH COMMAND REGISTRATION =================
const commands = [
  new SlashCommandBuilder()
    .setName('setup-utility')
    .setDescription('Deploy the Ticket and Contract buttons')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
].map(command => command.toJSON());

client.once('ready', async () => {
  console.log(`❄️  Logged in as ${client.user.tag}`);
  
  // Registering commands globally
  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ Slash commands registered.');
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
  }
});

// ================= UTILITIES =================
async function logToChannel(guild, channelId, embed) {
  const channel = guild.channels.cache.get(channelId);
  if (channel) await channel.send({ embeds: [embed] }).catch(() => {});
}

// ================= INTERACTION HANDLER =================
client.on('interactionCreate', async interaction => {
  
  // 1. Handle Slash Commands (Setup)
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'setup-utility') {
      const embed = new EmbedBuilder()
        .setTitle('Arctic Customs | Management')
        .setDescription('Select an option below to interact with staff or accept your employee contract.')
        .setColor(config.colors.primary);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('open_ticket').setLabel('Open Ticket').setStyle(ButtonStyle.Primary).setEmoji('🎟️'),
        new ButtonBuilder().setCustomId('accept_contract').setLabel('Accept Contract').setStyle(ButtonStyle.Success).setEmoji('📄')
      );

      await interaction.reply({ content: 'Setup deployed.', ephemeral: true });
      await interaction.channel.send({ embeds: [embed], components: [row] });
    }
  }

  // 2. Handle Button Interactions
  if (!interaction.isButton()) return;

  // --- OPEN TICKET ---
  if (interaction.customId === 'open_ticket') {
    await interaction.deferReply({ ephemeral: true });
    
    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: config.categories.tickets,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: config.roles.employee, allow: [PermissionsBitField.Flags.ViewChannel] }
      ]
    });

    const ticketEmbed = new EmbedBuilder()
      .setTitle('Arctic Customs Ticket')
      .setDescription(`Welcome <@${interaction.user.id}>, please state your inquiry.`)
      .setColor(config.colors.primary);

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger)
    );

    await channel.send({ content: `<@${interaction.user.id}> | <@&${config.roles.employee}>`, embeds: [ticketEmbed], components: [closeRow] });
    await interaction.editReply(`✅ Ticket created: ${channel}`);
    
    const log = new EmbedBuilder().setTitle('📂 Ticket Opened').setDescription(`User: ${interaction.user.tag}\nChannel: ${channel.name}`).setColor(config.colors.primary).setTimestamp();
    await logToChannel(interaction.guild, config.logs.tickets, log);
  }

  // --- CLOSE TICKET ---
  if (interaction.customId === 'close_ticket') {
    await interaction.reply('🔒 Closing in 5 seconds...');
    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    
    const log = new EmbedBuilder().setTitle('📁 Ticket Closed').setDescription(`Channel: ${interaction.channel.name}\nClosed by: ${interaction.user.tag}`).setColor(config.colors.danger).setTimestamp();
    await logToChannel(interaction.guild, config.logs.tickets, log);
  }

  // --- ACCEPT CONTRACT ---
  if (interaction.customId === 'accept_contract') {
    const role = interaction.guild.roles.cache.get(config.roles.employee);
    if (!role) return interaction.reply({ content: '❌ Employee role not found.', ephemeral: true });

    await interaction.member.roles.add(role);
    await interaction.reply({ content: '✅ Contract accepted! Welcome to the team.', ephemeral: true });
    
    const log = new EmbedBuilder().setTitle('📄 Contract Signed').setDescription(`User: <@${interaction.user.id}> has joined the staff team.`).setColor(config.colors.success).setTimestamp();
    await logToChannel(interaction.guild, config.logs.punishments, log);
  }
});

client.login(process.env.BOT_TOKEN);
