diff --git a/index.js b/index.js
index 75dff0cb319bb2d2339897a89c17ce0993c2d9b2..d03870397ab3e2e995379e137718d792bf70ae79 100644
--- a/index.js
+++ b/index.js
@@ -23,50 +23,61 @@ const client = new Client({
 const TOKEN = process.env.TOKEN;
 const CLIENT_ID = process.env.CLIENT_ID;
 const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
 
 
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
 
+function getTargetMember(interaction) {
+    return interaction.options.getMember("member");
+}
+
+async function replyWithError(interaction, message) {
+    if (interaction.replied || interaction.deferred) {
+        return interaction.followUp({ content: message, ephemeral: true });
+    }
+    return interaction.reply({ content: message, ephemeral: true });
+}
+
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
@@ -120,145 +131,170 @@ const rest = new REST({ version: '10' }).setToken(TOKEN);
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
 
-        const member = interaction.options.getMember("member");
+        const member = getTargetMember(interaction);
+        if (!member) return replyWithError(interaction, "Member not found.");
+
         const role = interaction.options.getRole("role");
+        if (!role) return replyWithError(interaction, "Role not found.");
+        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
+            return replyWithError(interaction, "I don't have permission to manage roles.");
+        }
+        if (role.position >= interaction.guild.members.me.roles.highest.position) {
+            return replyWithError(interaction, "I can't assign that role due to role hierarchy.");
+        }
 
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
 
-        const member = interaction.options.getMember("member");
+        const member = getTargetMember(interaction);
+        if (!member) return replyWithError(interaction, "Member not found.");
+
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
 
-        const member = interaction.options.getMember("member");
+        const member = getTargetMember(interaction);
+        if (!member) return replyWithError(interaction, "Member not found.");
+        if (!member.bannable) {
+            return replyWithError(interaction, "I cannot ban this member due to role hierarchy.");
+        }
+
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
 
-        const member = interaction.options.getMember("member");
+        const member = getTargetMember(interaction);
+        if (!member) return replyWithError(interaction, "Member not found.");
+        if (!member.kickable) {
+            return replyWithError(interaction, "I cannot kick this member due to role hierarchy.");
+        }
+
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
-        const member = interaction.options.getMember("member");
+        const member = getTargetMember(interaction);
+        if (!member) return replyWithError(interaction, "Member not found.");
 
         const embed = createEmbed(
             "👤 Member Information",
             `**Username:** ${member.user.tag}
 **ID:** ${member.id}
 **Joined:** <t:${Math.floor(member.joinedTimestamp/1000)}:F>
 **Account Created:** <t:${Math.floor(member.user.createdTimestamp/1000)}:F>
-**Roles:** ${member.roles.cache.map(r => r).join(", ")}`
+**Roles:** ${member.roles.cache.filter(role => role.id !== member.guild.id).map(role => role.toString()).join(", ") || "None"}`
         );
 
         await interaction.reply({ embeds: [embed] });
     }
 
     /* PURGE */
     if (commandName === "purge") {
         if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
             return interaction.reply({ content: "You lack permission.", ephemeral: true });
 
         const amount = interaction.options.getInteger("amount");
+        if (amount < 1 || amount > 100) {
+            return replyWithError(interaction, "Amount must be between 1 and 100.");
+        }
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
@@ -295,26 +331,25 @@ client.on('interactionCreate', async interaction => {
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
 
 process.on("unhandledRejection", console.error);
 process.on("uncaughtException", console.error);
-
