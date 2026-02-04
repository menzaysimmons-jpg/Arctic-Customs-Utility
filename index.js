require('dotenv').config();
const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    EmbedBuilder,
    SlashCommandBuilder,
    REST,
    Routes,
    ChannelType
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration
    ]
});

const MTQ2ODY5NzY3ODMyNTIxOTQ3Mg.GErFk6.E4HsGWNoNzBhpRuIoQtmPI2oNXhzpo11b0lGBE = process.env.TOKEN;
const 1468697678325219472 = process.env.CLIENT_ID;
const 1467264609718239273 = process.env.LOG_CHANNEL_ID;

/* ==========================================
   PROFESSIONAL EMBED CREATOR
========================================== */

function createEmbed(title, description, color = 0x00BFFF) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: "Arctic Customs Utility • Professional Moderation System" });
}

async function logAction(guild, embed) {
    const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
        logChannel.send({ embeds: [embed] });
    }
}

/* ==========================================
   SLASH COMMAND REGISTRATION
========================================== */

const commands = [

new SlashCommandBuilder()
    .setName("promote")
    .setDescription("Promote a member to a role.")
    .addUserOption(option =>
        option.setName("member").setDescription("Member to promote").setRequired(true))
    .addRoleOption(option =>
        option.setName("role").setDescription("Role to assign").setRequired(true)),

new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member.")
    .addUserOption(option =>
        option.setName("member").setDescription("Member to warn").setRequired(true))
    .addStringOption(option =>
        option.setName("reason").setDescription("Reason for warning").setRequired(true)),

new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member.")
    .addUserOption(option =>
        option.setName("member").setDescription("Member to ban").setRequired(true))
    .addStringOption(option =>
        option.setName("reason").setDescription("Reason").setRequired(true)),

new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member.")
    .addUserOption(option =>
        option.setName("member").setDescription("Member to kick").setRequired(true))
    .addStringOption(option =>
        option.setName("reason").setDescription("Reason").setRequired(true)),

new SlashCommandBuilder()
    .setName("whois")
    .setDescription("Get information about a member.")
    .addUserOption(option =>
        option.setName("member").setDescription("Member").setRequired(true)),

new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete multiple messages.")
    .addIntegerOption(option =>
        option.setName("amount").setDescription("Number of messages (1-100)").setRequired(true)),

new SlashCommandBuilder()
    .setName("lockdown")
    .setDescription("Lock the current channel."),

new SlashCommandBuilder()
    .setName("say")
    .setDescription("Make the bot say something.")
    .addStringOption(option =>
        option.setName("message").setDescription("Message to send").setRequired(true)),

new SlashCommandBuilder()
    .setName("serverstatus")
    .setDescription("View server statistics."),

new SlashCommandBuilder()
    .setName("help")
    .setDescription("View Arctic Customs Utility command list.")
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands.map(cmd => cmd.toJSON()) }
        );
        console.log("Slash commands registered.");
    } catch (error) {
        console.error(error);
    }
})();

/* ==========================================
   COMMAND HANDLER
========================================== */

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    /* PROMOTE */
    if (commandName === "promote") {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles))
            return interaction.reply({ content: "You lack permission.", ephemeral: true });

        const member = interaction.options.getMember("member");
        const role = interaction.options.getRole("role");

        await member.roles.add(role);

        const embed = createEmbed(
            "📈 Promotion Issued",
            `**Member:** ${member}\n**New Role:** ${role}\n**Promoted By:** ${interaction.user}`,
            0x2ECC71
        );

        await interaction.reply({ embeds: [embed] });
        logAction(interaction.guild, embed);
    }

    /* WARN */
    if (commandName === "warn") {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
            return interaction.reply({ content: "You lack permission.", ephemeral: true });

        const member = interaction.options.getMember("member");
        const reason = interaction.options.getString("reason");

        const embed = createEmbed(
            "⚠️ Formal Warning Issued",
            `**Member:** ${member}\n**Reason:** ${reason}\n**Issued By:** ${interaction.user}`,
            0xF1C40F
        );

        await interaction.reply({ embeds: [embed] });
        logAction(interaction.guild, embed);
    }

    /* BAN */
    if (commandName === "ban") {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers))
            return interaction.reply({ content: "You lack permission.", ephemeral: true });

        const member = interaction.options.getMember("member");
        const reason = interaction.options.getString("reason");

        await member.ban({ reason });

        const embed = createEmbed(
            "🔨 Member Banned",
            `**Member:** ${member.user.tag}\n**Reason:** ${reason}\n**Banned By:** ${interaction.user}`,
            0xE74C3C
        );

        await interaction.reply({ embeds: [embed] });
        logAction(interaction.guild, embed);
    }

    /* KICK */
    if (commandName === "kick") {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers))
            return interaction.reply({ content: "You lack permission.", ephemeral: true });

        const member = interaction.options.getMember("member");
        const reason = interaction.options.getString("reason");

        await member.kick(reason);

        const embed = createEmbed(
            "👢 Member Kicked",
            `**Member:** ${member.user.tag}\n**Reason:** ${reason}\n**Kicked By:** ${interaction.user}`,
            0xE67E22
        );

        await interaction.reply({ embeds: [embed] });
        logAction(interaction.guild, embed);
    }

    /* WHOIS */
    if (commandName === "whois") {
        const member = interaction.options.getMember("member");

        const embed = createEmbed(
            "👤 Member Information",
            `**Username:** ${member.user.tag}
**ID:** ${member.id}
**Joined:** <t:${Math.floor(member.joinedTimestamp/1000)}:F>
**Account Created:** <t:${Math.floor(member.user.createdTimestamp/1000)}:F>
**Roles:** ${member.roles.cache.map(r => r).join(", ")}`
        );

        await interaction.reply({ embeds: [embed] });
    }

    /* PURGE */
    if (commandName === "purge") {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
            return interaction.reply({ content: "You lack permission.", ephemeral: true });

        const amount = interaction.options.getInteger("amount");
        await interaction.channel.bulkDelete(amount, true);

        await interaction.reply({ content: `🧹 Successfully deleted ${amount} messages.`, ephemeral: true });
    }

    /* LOCKDOWN */
    if (commandName === "lockdown") {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels))
            return interaction.reply({ content: "You lack permission.", ephemeral: true });

        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            SendMessages: false
        });

        const embed = createEmbed(
            "🔒 Channel Lockdown Activated",
            `This channel has been secured by ${interaction.user}.`,
            0x5865F2
        );

        await interaction.reply({ embeds: [embed] });
        logAction(interaction.guild, embed);
    }

    /* SERVER STATUS */
    if (commandName === "serverstatus") {
        const embed = createEmbed(
            "📊 Server Status",
            `**Server Name:** ${interaction.guild.name}
**Total Members:** ${interaction.guild.memberCount}
**Channels:** ${interaction.guild.channels.cache.size}
**Roles:** ${interaction.guild.roles.cache.size}`
        );

        await interaction.reply({ embeds: [embed] });
    }

    /* SAY */
    if (commandName === "say") {
        const message = interaction.options.getString("message");
        await interaction.channel.send(message);
        await interaction.reply({ content: "Message sent.", ephemeral: true });
    }

    /* HELP */
    if (commandName === "help") {
        const embed = createEmbed(
            "📘 Arctic Customs Utility Command Panel",
            `
**Moderation**
/promote
/warn
/ban
/kick
/purge
/lockdown

**Information**
/whois
/serverstatus

**Utility**
/say
/help

Arctic Customs Utility is designed to provide a structured,
professional moderation experience with embed-based responses
and secure permission validation.
`
        );

        await interaction.reply({ embeds: [embed] });
    }

});

client.login(TOKEN);
