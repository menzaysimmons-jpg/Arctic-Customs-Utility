require("dotenv").config();
const fs = require('fs');
const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    PermissionsBitField,
    REST,
    Routes,
    SlashCommandBuilder,
    ActivityType,
    Collection
} = require("discord.js");

/* ==========================================
   1. CONFIGURATION & CONSTANTS
========================================== */
const CONFIG = {
    TOKEN: process.env.TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    GUILD_ID: process.env.GUILD_ID, // Useful for instant dev command updates
    LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID,
    OWNER_ID: process.env.OWNER_ID,
    DB_FILE: "./database.json",
    COLORS: {
        PRIMARY: 0x5865F2,
        SUCCESS: 0x2ECC71,
        DANGER: 0xE74C3C,
        WARNING: 0xF1C40F,
        DARK: 0x2C2F33
    },
    EMOJIS: {
        SUCCESS: "✅",
        ERROR: "❌",
        WARN: "⚠️",
        LOADING: "⏳",
        MOD: "🛡️"
    }
};

/* ==========================================
   2. DATABASE MANAGER (PERSISTENCE)
========================================== */
// A simple JSON-based database to store warnings/settings locally
class Database {
    constructor(filePath) {
        this.filePath = filePath;
        this.data = { warnings: {}, settings: {} };
        this.load();
    }

    load() {
        if (!fs.existsSync(this.filePath)) {
            this.save();
            return;
        }
        try {
            const raw = fs.readFileSync(this.filePath);
            this.data = JSON.parse(raw);
        } catch (e) {
            console.error("Database corruption detected. Resetting DB.");
            this.save();
        }
    }

    save() {
        fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    }

    addWarning(userId, guildId, reason, moderatorId) {
        const key = `${guildId}-${userId}`;
        if (!this.data.warnings[key]) this.data.warnings[key] = [];
        
        const warning = {
            id: Date.now().toString(36),
            reason,
            moderatorId,
            timestamp: Date.now()
        };
        
        this.data.warnings[key].push(warning);
        this.save();
        return warning;
    }

    getWarnings(userId, guildId) {
        return this.data.warnings[`${guildId}-${userId}`] || [];
    }

    clearWarnings(userId, guildId) {
        delete this.data.warnings[`${guildId}-${userId}`];
        this.save();
    }
}

const db = new Database(CONFIG.DB_FILE);

/* ==========================================
   3. UTILITY & HELPERS
========================================== */
class Utils {
    static createEmbed(type, title, description) {
        let color;
        switch(type) {
            case 'success': color = CONFIG.COLORS.SUCCESS; break;
            case 'error': color = CONFIG.COLORS.DANGER; break;
            case 'warn': color = CONFIG.COLORS.WARNING; break;
            default: color = CONFIG.COLORS.PRIMARY;
        }

        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setTimestamp()
            .setFooter({ text: `System v3.0 • ${CONFIG.EMOJIS.MOD} Secure` });
    }

    static parseDuration(str) {
        if (!str) return null;
        const match = str.match(/^(\d+)(s|m|h|d|w)$/);
        if (!match) return null;
        const value = parseInt(match[1]);
        const unit = match[2];
        const multiplier = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
        return value * multiplier[unit];
    }

    static async logToChannel(guild, embed) {
        if (!CONFIG.LOG_CHANNEL_ID) return;
        const channel = guild.channels.cache.get(CONFIG.LOG_CHANNEL_ID);
        if (channel && channel.isTextBased()) {
            await channel.send({ embeds: [embed] }).catch(() => {});
        }
    }
    
    static checkPermissions(interaction, permission) {
        if (!interaction.member.permissions.has(permission)) {
            interaction.reply({ 
                embeds: [Utils.createEmbed('error', 'Access Denied', 'You lack the required permissions.')], 
                ephemeral: true 
            });
            return false;
        }
        return true;
    }
}

/* ==========================================
   4. COMMAND LOGIC
========================================== */
const commands = new Collection();
const cooldowns = new Collection();

const commandDefinitions = [
    // --- MODERATION: BAN ---
    {
        data: new SlashCommandBuilder()
            .setName("ban")
            .setDescription("Ban a user with a confirmation prompt.")
            .addUserOption(o => o.setName("target").setDescription("User to ban").setRequired(true))
            .addStringOption(o => o.setName("reason").setDescription("Reason for ban")),
        async execute(interaction) {
            if (!Utils.checkPermissions(interaction, PermissionsBitField.Flags.BanMembers)) return;

            const target = interaction.options.getMember("target");
            const reason = interaction.options.getString("reason") || "No reason provided";

            if (!target) return interaction.reply({ content: "User not found.", ephemeral: true });
            if (!target.bannable) return interaction.reply({ content: "I cannot ban this user (Hierarchy error).", ephemeral: true });

            // Button Confirmation System
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_ban').setLabel('Confirm Ban').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_ban').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
            );

            const embed = Utils.createEmbed('warn', 'Ban Confirmation', `Are you sure you want to ban **${target.user.tag}**?\nReason: ${reason}`);
            const response = await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

            const collector = response.createMessageComponentCollector({ time: 15000 });

            collector.on('collect', async i => {
                if (i.customId === 'confirm_ban') {
                    await target.ban({ reason });
                    await i.update({ content: `${CONFIG.EMOJIS.SUCCESS} Banned **${target.user.tag}**.`, embeds: [], components: [] });
                    
                    Utils.logToChannel(interaction.guild, Utils.createEmbed('error', 'User Banned', `User: ${target.user.tag}\nMod: ${interaction.user.tag}\nReason: ${reason}`));
                } else {
                    await i.update({ content: "Ban cancelled.", embeds: [], components: [] });
                }
            });
        }
    },

    // --- MODERATION: TIMEOUT (MUTE) ---
    {
        data: new SlashCommandBuilder()
            .setName("timeout")
            .setDescription("Timeout (mute) a user.")
            .addUserOption(o => o.setName("target").setDescription("User").setRequired(true))
            .addStringOption(o => o.setName("duration").setDescription("Format: 1m, 1h, 1d").setRequired(true))
            .addStringOption(o => o.setName("reason").setDescription("Reason")),
        async execute(interaction) {
            if (!Utils.checkPermissions(interaction, PermissionsBitField.Flags.ModerateMembers)) return;

            const target = interaction.options.getMember("target");
            const durationRaw = interaction.options.getString("duration");
            const reason = interaction.options.getString("reason") || "No reason";
            const ms = Utils.parseDuration(durationRaw);

            if (!ms) return interaction.reply({ content: "Invalid duration format. Use 1m, 1h, 1d.", ephemeral: true });
            if (!target.moderatable) return interaction.reply({ content: "Cannot timeout this user.", ephemeral: true });

            await target.timeout(ms, reason);
            
            const embed = Utils.createEmbed('success', 'User Timed Out', `**User:** ${target}\n**Duration:** ${durationRaw}\n**Reason:** ${reason}`);
            interaction.reply({ embeds: [embed] });
            Utils.logToChannel(interaction.guild, embed);
        }
    },

    // --- UTILITY: LOCKDOWN ---
    {
        data: new SlashCommandBuilder()
            .setName("lockdown")
            .setDescription("Lock or unlock the current channel.")
            .addStringOption(o => 
                o.setName("action")
                .setDescription("Lock or Unlock")
                .setRequired(true)
                .addChoices({ name: 'Lock', value: 'lock' }, { name: 'Unlock', value: 'unlock' })),
        async execute(interaction) {
            if (!Utils.checkPermissions(interaction, PermissionsBitField.Flags.ManageChannels)) return;
            
            const action = interaction.options.getString("action");
            const channel = interaction.channel;

            if (action === 'lock') {
                await channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false });
                interaction.reply({ embeds: [Utils.createEmbed('error', '🔒 Lockdown Active', 'This channel has been locked by a moderator.')] });
            } else {
                await channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: null });
                interaction.reply({ embeds: [Utils.createEmbed('success', '🔓 Lockdown Lifted', 'This channel is now open.')] });
            }
        }
    },

    // --- SYSTEM: WARN (WITH DB) ---
    {
        data: new SlashCommandBuilder()
            .setName("warn")
            .setDescription("Issue a formal warning.")
            .addUserOption(o => o.setName("target").setDescription("User").setRequired(true))
            .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(true)),
        async execute(interaction) {
            if (!Utils.checkPermissions(interaction, PermissionsBitField.Flags.ModerateMembers)) return;

            const target = interaction.options.getUser("target");
            const reason = interaction.options.getString("reason");

            db.addWarning(target.id, interaction.guild.id, reason, interaction.user.id);
            const count = db.getWarnings(target.id, interaction.guild.id).length;

            const embed = Utils.createEmbed('warn', 'Warning Issued', `**User:** ${target.tag}\n**Reason:** ${reason}\n**Total Warnings:** ${count}`);
            
            // Try to DM the user
            target.send({ embeds: [Utils.createEmbed('error', `Warned in ${interaction.guild.name}`, `Reason: ${reason}`)] }).catch(() => {});
            
            interaction.reply({ embeds: [embed] });
            Utils.logToChannel(interaction.guild, embed);
        }
    },

    // --- UTILITY: USER INFO ---
    {
        data: new SlashCommandBuilder()
            .setName("whois")
            .setDescription("Advanced user lookup.")
            .addUserOption(o => o.setName("target").setDescription("User")),
        async execute(interaction) {
            const member = interaction.options.getMember("target") || interaction.member;
            const warnings = db.getWarnings(member.id, interaction.guild.id);
            
            const roles = member.roles.cache
                .filter(r => r.id !== interaction.guild.id)
                .sort((a, b) => b.position - a.position)
                .map(r => r)
                .slice(0, 10); // Only show top 10

            const embed = new EmbedBuilder()
                .setTitle(`👤 ${member.user.tag}`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .setColor(member.displayHexColor)
                .addFields(
                    { name: "Joined Server", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                    { name: "Account Created", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: "Warnings", value: `${warnings.length}`, inline: true },
                    { name: `Roles [${member.roles.cache.size - 1}]`, value: roles.length ? roles.join(" ") : "None" }
                )
                .setFooter({ text: `ID: ${member.id}` });

            interaction.reply({ embeds: [embed] });
        }
    },

    // --- FUN: POLL ---
    {
        data: new SlashCommandBuilder()
            .setName("poll")
            .setDescription("Create a voting poll.")
            .addStringOption(o => o.setName("question").setDescription("The question").setRequired(true)),
        async execute(interaction) {
            const question = interaction.options.getString("question");
            
            const embed = Utils.createEmbed('success', '📊 New Poll', question);
            const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
            
            await msg.react('👍');
            await msg.react('👎');
        }
    }
];

// Load commands into collection
commandDefinitions.forEach(cmd => commands.set(cmd.data.name, cmd));

/* ==========================================
   5. CLIENT SETUP & EVENTS
========================================== */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // Required for Auto-Mod
        GatewayIntentBits.GuildPresences
    ],
    partials: [Partials.Channel, Partials.Message]
});

// --- READY EVENT ---
client.once("ready", async () => {
    console.log(`[SYSTEM] Logged in as ${client.user.tag}`);
    console.log(`[SYSTEM] Database loaded with ${Object.keys(db.data.warnings).length} records.`);

    // Register Commands
    const rest = new REST({ version: "10" }).setToken(CONFIG.TOKEN);
    try {
        console.log("[SYSTEM] Refreshing application (/) commands...");
        // Use Routes.applicationGuildCommands for instant updates in dev, applicationCommands for global (takes 1h)
        const route = CONFIG.GUILD_ID 
            ? Routes.applicationGuildCommands(CONFIG.CLIENT_ID, CONFIG.GUILD_ID)
            : Routes.applicationCommands(CONFIG.CLIENT_ID);
            
        await rest.put(route, { body: commandDefinitions.map(c => c.data.toJSON()) });
        console.log("[SYSTEM] Commands successfully registered.");
    } catch (error) {
        console.error(error);
    }

    // Status Rotator
    const activities = [
        { name: 'Over the Server', type: ActivityType.Watching },
        { name: '/help for info', type: ActivityType.Playing },
        { name: 'Security v3.0', type: ActivityType.Listening }
    ];
    let i = 0;
    setInterval(() => {
        client.user.setActivity(activities[i]);
        i = ++i % activities.length;
    }, 10000);
});

// --- INTERACTION HANDLER ---
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);
    if (!command) return;

    // Cooldown Manager
    const { user } = interaction;
    if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
    }
    const timestamps = cooldowns.get(command.data.name);
    const cooldownAmount = 3000; // 3 seconds default
    const now = Date.now();

    if (timestamps.has(user.id)) {
        const expirationTime = timestamps.get(user.id) + cooldownAmount;
        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return interaction.reply({ content: `Please wait ${timeLeft.toFixed(1)}s before using this command again.`, ephemeral: true });
        }
    }
    timestamps.set(user.id, now);
    setTimeout(() => timestamps.delete(user.id), cooldownAmount);

    // Execute
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});

// --- AUTO-MODERATION (Message Event) ---
client.on("messageCreate", async message => {
    if (message.author.bot) return;

    const badWords = ["scam", "free nitro", "steam drop"]; // Add real regex here
    
    if (badWords.some(word => message.content.toLowerCase().includes(word))) {
        // Prevent deletion of Admin messages
        if (message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;

        await message.delete();
        const warningMsg = await message.channel.send(`${message.author}, that language/content is prohibited.`);
        setTimeout(() => warningMsg.delete().catch(() => {}), 5000);
        
        Utils.logToChannel(message.guild, Utils.createEmbed('warn', 'Auto-Mod Action', `Deleted message from ${message.author} containing flagged keywords.`));
    }
});

// --- WELCOME SYSTEM ---
client.on("guildMemberAdd", async member => {
    // This requires a channel named 'welcome' to exist
    const channel = member.guild.channels.cache.find(ch => ch.name === 'welcome');
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle(`Welcome to ${member.guild.name}!`)
        .setDescription(`Hello ${member}, please read the rules and enjoy your stay.`)
        .setThumbnail(member.user.displayAvatarURL())
        .setColor(CONFIG.COLORS.SUCCESS);

    await channel.send({ embeds: [embed] });
});

/* ==========================================
   6. ERROR HANDLING (Prevent Crashes)
========================================== */
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

client.login(CONFIG.TOKEN);
