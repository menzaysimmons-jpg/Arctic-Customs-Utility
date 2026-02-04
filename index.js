require("dotenv").config();
const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    REST,
    Routes,
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

/* ==========================================
   CONFIG
========================================== */

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

/* ==========================================
   CLIENT SETUP
========================================== */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

/* ==========================================
   EMBED CREATOR
========================================== */

function createEmbed(title, description, color = 0x00BFFF) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp()
        .setFooter({
            text: "Arctic Customs Utility • Professional Moderation System"
        });
}

/* ==========================================
   SAFETY UTILITIES
========================================== */

function getTargetMember(interaction, name = "member") {
    return interaction.options.getMember(name);
}

async function replyWithError(interaction, message) {
    if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: message, ephemeral: true });
    }
    return interaction.reply({ content: message, ephemeral: true });
}

async function safeLogAction(guild, embed) {
    try {
        const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
        if (!logChannel || !logChannel.isTextBased()) return;
        await logChannel.send({ embeds: [embed] });
    } catch (err) {
        console.error("Log error:", err);
    }
}

function hierarchyCheck(interaction, member) {
    if (member.id === interaction.user.id)
        return "You cannot target yourself.";

    if (member.id === interaction.guild.ownerId)
        return "You cannot target the server owner.";

    if (
        member.roles.highest.position >=
        interaction.member.roles.highest.position
    )
        return "You cannot moderate this member due to role hierarchy.";

    return null;
}

/* ==========================================
   SLASH COMMANDS
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
        option.setName("reason").setDescription("Reason for ban").setRequired(true)),

new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member.")
    .addUserOption(option =>
        option.setName("member").setDescription("Member to kick").setRequired(true))
    .addStringOption(option =>
        option.setName("reason").setDescription("Reason for kick").setRequired(true)),

new SlashCommandBuilder()
    .setName("whois")
    .setDescription("View information about a member.")
    .addUserOption(option =>
        option.setName("member").setDescription("Member to lookup").setRequired(true)),

new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete multiple messages.")
    .addIntegerOption(option =>
        option.setName("amount").setDescription("Amount (1-100)").setRequired(true))
];

/* ==========================================
   REGISTER COMMANDS
========================================== */

const rest = new REST({ version: "10" }).setToken(TOKEN);

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

client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    try {

        /* ================= PROMOTE ================= */
        if (commandName === "promote") {

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles))
                return replyWithError(interaction, "You lack permission.");

            const member = getTargetMember(interaction);
            const role = interaction.options.getRole("role");

            if (!member) return replyWithError(interaction, "Member not found.");
            if (!role) return replyWithError(interaction, "Role not found.");

            const hierarchyError = hierarchyCheck(interaction, member);
            if (hierarchyError) return replyWithError(interaction, hierarchyError);

            if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles))
                return replyWithError(interaction, "I don't have permission to manage roles.");

            if (role.position >= interaction.guild.members.me.roles.highest.position)
                return replyWithError(interaction, "Role is higher than my highest role.");

            await member.roles.add(role);

            const embed = createEmbed(
                "📈 Promotion Issued",
                `**Member:** ${member}\n**New Role:** ${role}\n**Promoted By:** ${interaction.user}`,
                0x2ECC71
            );

            await interaction.reply({ embeds: [embed] });
            safeLogAction(interaction.guild, embed);
        }

        /* ================= WARN ================= */
        if (commandName === "warn") {

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
                return replyWithError(interaction, "You lack permission.");

            const member = getTargetMember(interaction);
            const reason = interaction.options.getString("reason");

            if (!member) return replyWithError(interaction, "Member not found.");

            const hierarchyError = hierarchyCheck(interaction, member);
            if (hierarchyError) return replyWithError(interaction, hierarchyError);

            const embed = createEmbed(
                "⚠️ Formal Warning Issued",
                `**Member:** ${member}\n**Reason:** ${reason}\n**Issued By:** ${interaction.user}`,
                0xF1C40F
            );

            await interaction.reply({ embeds: [embed] });
            safeLogAction(interaction.guild, embed);
        }

        /* ================= BAN ================= */
        if (commandName === "ban") {

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers))
                return replyWithError(interaction, "You lack permission.");

            const member = getTargetMember(interaction);
            const reason = interaction.options.getString("reason");

            if (!member) return replyWithError(interaction, "Member not found.");

            const hierarchyError = hierarchyCheck(interaction, member);
            if (hierarchyError) return replyWithError(interaction, hierarchyError);

            if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers))
                return replyWithError(interaction, "I don't have permission to ban members.");

            if (!member.bannable)
                return replyWithError(interaction, "I cannot ban this member.");

            await member.ban({ reason });

            const embed = createEmbed(
                "🔨 Member Banned",
                `**Member:** ${member.user.tag}\n**Reason:** ${reason}\n**Banned By:** ${interaction.user}`,
                0xE74C3C
            );

            await interaction.reply({ embeds: [embed] });
            safeLogAction(interaction.guild, embed);
        }

        /* ================= KICK ================= */
        if (commandName === "kick") {

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers))
                return replyWithError(interaction, "You lack permission.");

            const member = getTargetMember(interaction);
            const reason = interaction.options.getString("reason");

            if (!member) return replyWithError(interaction, "Member not found.");

            const hierarchyError = hierarchyCheck(interaction, member);
            if (hierarchyError) return replyWithError(interaction, hierarchyError);

            if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers))
                return replyWithError(interaction, "I don't have permission to kick members.");

            if (!member.kickable)
                return replyWithError(interaction, "I cannot kick this member.");

            await member.kick(reason);

            const embed = createEmbed(
                "👢 Member Kicked",
                `**Member:** ${member.user.tag}\n**Reason:** ${reason}\n**Kicked By:** ${interaction.user}`,
                0xE67E22
            );

            await interaction.reply({ embeds: [embed] });
            safeLogAction(interaction.guild, embed);
        }

        /* ================= WHOIS ================= */
        if (commandName === "whois") {

            const member = getTargetMember(interaction);
            if (!member) return replyWithError(interaction, "Member not found.");

            const roles = member.roles.cache
                .filter(r => r.id !== member.guild.id)
                .map(r => r.toString());

            const roleList = roles.length ? roles.join(", ") : "None";

            const embed = createEmbed(
                "👤 Member Information",
                `**Username:** ${member.user.tag}
**ID:** ${member.id}
**Joined:** <t:${Math.floor(member.joinedTimestamp / 1000)}:F>
**Account Created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:F>
**Roles:** ${roleList}`
            );

            await interaction.reply({ embeds: [embed] });
        }

        /* ================= PURGE ================= */
        if (commandName === "purge") {

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
                return replyWithError(interaction, "You lack permission.");

            if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages))
                return replyWithError(interaction, "I don't have permission to manage messages.");

            const amount = interaction.options.getInteger("amount");

            if (amount < 1 || amount > 100)
                return replyWithError(interaction, "Amount must be between 1 and 100.");

            await interaction.channel.bulkDelete(amount, true);

            await interaction.reply({
                content: `🧹 Successfully deleted ${amount} messages.`,
                ephemeral: true
            });
        }

    } catch (err) {
        console.error("Command Error:", err);
        return replyWithError(interaction, "An unexpected error occurred.");
    }
});

/* ==========================================
   READY
========================================== */

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.login(TOKEN);
