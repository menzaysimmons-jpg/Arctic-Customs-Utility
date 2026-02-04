require('dotenv').config();
const http = require('http');
const { 
  Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder, 
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType,
  REST, Routes, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');

// Railway Health Check
http.createServer((req, res) => res.end('Arctic Customs Utility: Elite Edition Online')).listen(process.env.PORT || 3000);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages]
});

// ================= THEME & CONFIG =================
const THEME = {
  primary: 0x24d2ce, // Arctic Teal
  danger: 0xff4d4d,
  success: 0x00ffaa,
  banner: 'https://i.imgur.com/your_banner_link.png', // Upload your custom GFX here
  logo: 'https://i.imgur.com/your_logo_link.png'
};

const CHANNELS = {
  logs: '1467264765033320706',
  apps: '1467302915659272406',
  tickets: '1467262468379115522'
};

// ================= COMMAND DEFINITIONS =================
const commands = [
  new SlashCommandBuilder().setName('setup-hub').setDescription('Deploy the Arctic Customs Professional Hub'),
  new SlashCommandBuilder().setName('whois').setDescription('Advanced user profile lookup')
    .addUserOption(o => o.setName('target').setDescription('Member to inspect').setRequired(true)),
  new SlashCommandBuilder().setName('infraction').setDescription('Log a formal staff infraction')
    .addUserOption(o => o.setName('user').setDescription('Target staff').setRequired(true))
    .addStringOption(o => o.setName('type').setDescription('Warning/Strike/Demotion').setRequired(true).addChoices(
        {name: 'Warning', value: 'warn'}, {name: 'Strike 1', value: 's1'}, {name: 'Strike 2', value: 's2'}
    ))
    .addStringOption(o => o.setName('reason').setDescription('Reasoning').setRequired(true)),
].map(c => c.toJSON());

// ================= LOGIC HANDLERS =================

client.once('ready', async () => {
  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
  console.log('❄️  Arctic Customs Elite Operational');
});

client.on('interactionCreate', async interaction => {
  
  // --- 1. SETUP HUB (THE VISUAL GFX) ---
  if (interaction.commandName === 'setup-hub') {
    const mainEmbed = new EmbedBuilder()
      .setTitle('ARCTIC CUSTOMS | CENTRAL DASHBOARD')
      .setDescription('> "Precision Designs, Crystal Clear Quality"\n\nWelcome to the official Arctic Customs management terminal. Use the modules below to navigate.')
      .addFields(
        { name: '🔗 QUICK NAVIGATION', value: '• [Marketplace](https://discord.com)\n• [Terms of Service](https://discord.com)\n• [Our Portfolio](https://discord.com)', inline: false },
        { name: '📂 APPLICATIONS', value: 'Currently seeking: **Designers** and **Support Staff**.', inline: false }
      )
      .setImage(THEME.banner)
      .setColor(THEME.primary)
      .setFooter({ text: 'Arctic Customs Utility • System v2.0', iconURL: THEME.logo });

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('open_ticket').setLabel('Open Ticket').setStyle(ButtonStyle.Primary).setEmoji('🎟️'),
      new ButtonBuilder().setCustomId('apply_designer').setLabel('Designer App').setStyle(ButtonStyle.Danger).setEmoji('🎨')
    );

    await interaction.reply({ content: 'Hub deployed.', ephemeral: true });
    await interaction.channel.send({ embeds: [mainEmbed], components: [row1] });
  }

  // --- 2. MODAL SYSTEM (THE POP-UP FORM) ---
  if (interaction.isButton() && interaction.customId === 'apply_designer') {
    const modal = new ModalBuilder().setCustomId('designer_modal').setTitle('Designer Application');

    const expInput = new TextInputBuilder()
      .setCustomId('exp')
      .setLabel("How long have you been designing?")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. 2 years');

    const portInput = new TextInputBuilder()
      .setCustomId('portfolio')
      .setLabel("Link to your portfolio")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('https://behance.net/...');

    modal.addComponents(new ActionRowBuilder().addComponents(expInput), new ActionRowBuilder().addComponents(portInput));
    await interaction.showModal(modal);
  }

  // --- 3. MODAL SUBMISSION HANDLER ---
  if (interaction.isModalSubmit() && interaction.customId === 'designer_modal') {
    const exp = interaction.fields.getTextInputValue('exp');
    const port = interaction.fields.getTextInputValue('portfolio');

    const logEmbed = new EmbedBuilder()
      .setTitle('🎨 New Designer Application')
      .setColor(THEME.primary)
      .addFields(
        { name: 'Applicant', value: `${interaction.user} (${interaction.user.id})` },
        { name: 'Experience', value: exp },
        { name: 'Portfolio', value: port }
      )
      .setTimestamp();

    await client.channels.cache.get(CHANNELS.apps).send({ embeds: [logEmbed] });
    await interaction.reply({ content: '✅ Your application has been sent to HR.', ephemeral: true });
  }

  // --- 4. WHOIS COMMAND (PROFESSIONAL LOOKUP) ---
  if (interaction.commandName === 'whois') {
    const target = interaction.options.getMember('target');
    const embed = new EmbedBuilder()
      .setAuthor({ name: `Profile: ${target.user.tag}`, iconURL: target.user.displayAvatarURL() })
      .setThumbnail(target.user.displayAvatarURL())
      .setColor(THEME.primary)
      .addFields(
        { name: 'Registration', value: `<t:${Math.floor(target.user.createdTimestamp / 1000)}:D>`, inline: true },
        { name: 'Joined', value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: 'Permissions', value: target.permissions.has(PermissionsBitField.Flags.Administrator) ? '`ADMINISTRATOR`' : '`STANDARD`', inline: false },
        { name: `Roles [${target.roles.cache.size - 1}]`, value: target.roles.cache.map(r => r).join(' ').slice(0, 1024) || 'None' }
      );
    
    await interaction.reply({ embeds: [embed] });
  }
});

client.login(process.env.BOT_TOKEN);
