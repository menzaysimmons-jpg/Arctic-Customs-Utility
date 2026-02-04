require('dotenv').config();
const http = require('http');
const { 
  Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder, 
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType,
  REST, Routes, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');

// Railway Health Check & Web Presence
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Arctic Customs Utility: Elite Operational</h1>');
}).listen(process.env.PORT || 3000);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages]
});

// ================= BRANDING & DATA =================
const ARCTIC = {
  colors: {
    main: 0x24d2ce,   // Signature Teal
    danger: 0xff4747, // Crimson Red
    success: 0x47ff85 // Emerald Green
  },
  assets: {
    banner: 'https://i.imgur.com/example_banner.png', // Replace with your GFX
    icon: 'https://i.imgur.com/example_logo.png'
  }
};

const CHANNELS = {
    logs: '1467264765033320706',
    apps: '1467302915659272406',
    tickets: '1467262468379115522'
};

// ================= COMPREHENSIVE COMMAND LIST =================
const commands = [
  // --- SYSTEM SETTINGS ---
  new SlashCommandBuilder().setName('setup-hub').setDescription('Initialize the Arctic Customs Management Terminal'),
  
  // --- STAFF UTILITY (CIRCLE/CENTRAL INSPIRED) ---
  new SlashCommandBuilder().setName('whois').setDescription('Retrieve advanced biometric and server data for a member')
    .addUserOption(o => o.setName('target').setDescription('The subject of investigation').setRequired(true)),
    
  new SlashCommandBuilder().setName('server-stats').setDescription('Display real-time community growth and status'),

  // --- FORMAL INFRACTION SYSTEM ---
  new SlashCommandBuilder().setName('infraction').setDescription('Issue a formal disciplinary action')
    .addUserOption(o => o.setName('user').setDescription('Target').setRequired(true))
    .addStringOption(o => o.setName('type').setDescription('Tier of action').setRequired(true)
        .addChoices({name: 'Verbal Warning', value: 'verbal'}, {name: 'Strike 1', value: 's1'}, {name: 'Formal Ban', value: 'ban'}))
    .addStringOption(o => o.setName('reason').setDescription('The factual basis for this action').setRequired(true)),

  // --- STAFF CAREER MANAGEMENT ---
  new SlashCommandBuilder().setName('staff-action').setDescription('Process a promotion or resignation')
    .addStringOption(o => o.setName('action').setDescription('Action type').setRequired(true)
        .addChoices({name: 'Promotion', value: 'promote'}, {name: 'Resignation', value: 'resign'}))
    .addUserOption(o => o.setName('user').setDescription('Staff member').setRequired(true))
    .addStringOption(o => o.setName('notes').setDescription('Supporting details').setRequired(false)),

].map(c => c.toJSON());

// ================= INTERACTION SYSTEM =================

client.once('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log(`❄️  Elite System Active: ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    
    // --- DASHBOARD DEPLOYMENT ---
    if (interaction.commandName === 'setup-hub') {
        const hubEmbed = new EmbedBuilder()
            .setAuthor({ name: 'ARCTIC CUSTOMS | MANAGEMENT TERMINAL', iconURL: ARCTIC.assets.icon })
            .setTitle('Main Access Gateway')
            .setDescription('> Welcome to the Arctic Customs internal operations hub. This interface is designed for high-efficiency management and support routing.')
            .setImage(ARCTIC.assets.banner)
            .addFields(
                { name: '🎟️ Support Ticketing', value: 'Access our specialized support streams for designs, affiliations, and general inquiries.', inline: true },
                { name: '📄 Career Opportunities', value: 'Apply for Designer, Employee, or Management positions via our secure modal forms.', inline: true }
            )
            .setColor(ARCTIC.colors.main)
            .setFooter({ text: 'Proprietary System of Arctic Customs © 2026' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_ticket').setLabel('Open Ticket').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('btn_apply').setLabel('Submit Application').setStyle(ButtonStyle.Success)
        );

        await interaction.reply({ content: 'Terminal successfully deployed.', ephemeral: true });
        await interaction.channel.send({ embeds: [hubEmbed], components: [row] });
    }

    // --- BUTTONS & MODALS ---
    if (interaction.isButton()) {
        if (interaction.customId === 'btn_apply') {
            const modal = new ModalBuilder().setCustomId('apply_modal').setTitle('Official Application Form');

            const q1 = new TextInputBuilder().setCustomId('pos').setLabel('Which position are you seeking?').setStyle(TextInputStyle.Short).setRequired(true);
            const q2 = new TextInputBuilder().setCustomId('reason').setLabel('Why should Arctic Customs hire you?').setStyle(TextInputStyle.Paragraph).setRequired(true);
            
            modal.addComponents(new ActionRowBuilder().addComponents(q1), new ActionRowBuilder().addComponents(q2));
            await interaction.showModal(modal);
        }
    }

    // --- MODAL SUBMISSION ---
    if (interaction.isModalSubmit() && interaction.customId === 'apply_modal') {
        const pos = interaction.fields.getTextInputValue('pos');
        const reason = interaction.fields.getTextInputValue('reason');

        const log = new EmbedBuilder()
            .setTitle('📩 NEW INBOUND APPLICATION')
            .setColor(ARCTIC.colors.success)
            .setDescription(`**Applicant:** ${interaction.user.tag}\n**Position:** ${pos}\n**Statement:** ${reason}`)
            .setTimestamp();

        await client.channels.cache.get(CHANNELS.apps).send({ embeds: [log] });
        await interaction.reply({ content: '✅ Application successfully transmitted to HQ.', ephemeral: true });
    }

    // --- WHOIS (PROFESSIONAL LOOKUP) ---
    if (interaction.commandName === 'whois') {
        const target = interaction.options.getMember('target');
        const whois = new EmbedBuilder()
            .setAuthor({ name: `Subject Identification: ${target.user.username}`, iconURL: target.user.displayAvatarURL() })
            .setColor(ARCTIC.colors.main)
            .setThumbnail(target.user.displayAvatarURL())
            .addFields(
                { name: '📅 IDENTIFICATION', value: `> **ID:** \`${target.id}\` \n> **Created:** <t:${Math.floor(target.user.createdTimestamp / 1000)}:R>`, inline: false },
                { name: '📊 SERVER STATUS', value: `> **Joined:** <t:${Math.floor(target.joinedTimestamp / 1000)}:f> \n> **Highest Rank:** ${target.roles.highest}`, inline: false }
            );
        await interaction.reply({ embeds: [whois] });
    }
});

client.login(process.env.BOT_TOKEN);
