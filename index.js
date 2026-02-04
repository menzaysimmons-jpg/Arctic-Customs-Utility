client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

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
            return replyWithError(interaction, "I can't assign that role due to role hierarchy.");

        try {
            await member.roles.add(role);
        } catch (err) {
            console.error(err);
            return replyWithError(interaction, "Failed to assign role.");
        }

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
            return replyWithError(interaction, "I cannot ban this member due to role hierarchy.");

        try {
            await member.ban({ reason });
        } catch (err) {
            console.error(err);
            return replyWithError(interaction, "Failed to ban member.");
        }

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
            return replyWithError(interaction, "I cannot kick this member due to role hierarchy.");

        try {
            await member.kick(reason);
        } catch (err) {
            console.error(err);
            return replyWithError(interaction, "Failed to kick member.");
        }

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

        const roleList = roles.length
            ? roles.slice(0, 20).join(", ") + (roles.length > 20 ? "..." : "")
            : "None";

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

        try {
            await interaction.channel.bulkDelete(amount, true);
        } catch (err) {
            console.error(err);
            return replyWithError(interaction, "Failed to delete messages.");
        }

        await interaction.reply({
            content: `🧹 Successfully deleted ${amount} messages.`,
            ephemeral: true
        });
    }
});
