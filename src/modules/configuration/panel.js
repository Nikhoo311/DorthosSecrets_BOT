const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, ContainerBuilder, RoleSelectMenuBuilder, SectionBuilder, SeparatorBuilder, SeparatorSpacingSize, StringSelectMenuBuilder, TextDisplayBuilder } = require("discord.js");
const { color } = require("../../../config/config.json");

function toColorInt(color) {
    const value = parseInt(color.replace("#", ""), 16);
    return Number.isNaN(value) ? null : value;
}

function separator() {
    return new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small);
}

function buildSettingsHome() {
    const menu = new StringSelectMenuBuilder()
        .setCustomId("select-parameters:category")
        .setPlaceholder("Choisis un espace à configurer")
        .addOptions(
            { label: "Message de bienvenue", value: "welcome", emoji: "👋" },
            { label: "Espace officier", value: "officers", emoji: "🛡️" },
        );

    return new ContainerBuilder()
        .setAccentColor(toColorInt(color.orange))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent("## ⚙️ Paramètres"))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            "Configure le message de bienvenue et les permissions des officiers. Sélectionne une option ci-dessous pour la modifier.",
        ))
        .addSeparatorComponents(separator())
        .addActionRowComponents(new ActionRowBuilder().addComponents(menu));
}

function buildWelcomePanel(configuration) {
    const roleMenu = new RoleSelectMenuBuilder()
        .setCustomId("select-parameters:welcome-role")
        .setPlaceholder("Choisis le rôle des nouveaux membres")
        .setMinValues(0)
        .setMaxValues(1);
    const channelMenu = new ChannelSelectMenuBuilder()
        .setCustomId("select-parameters:welcome-channel")
        .setPlaceholder("Choisis le salon de bienvenue")
        .setMinValues(0)
        .setMaxValues(1)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);
    if (configuration.newMembeRoleId) roleMenu.setDefaultRoles(configuration.newMembeRoleId);
    if (configuration.welcomeChannelId) channelMenu.setDefaultChannels(configuration.welcomeChannelId);

    return new ContainerBuilder()
        .setAccentColor(toColorInt(color.orange))
        .addSectionComponents(new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("## 👋 Message de bienvenue"))
            .setButtonAccessory(new ButtonBuilder().setCustomId("button-parameters:return").setLabel("Retour").setEmoji("↩️").setStyle(ButtonStyle.Secondary)),
        )
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `Choisis le rôle automatiquement attribué aux nouveaux membres et le salon où le bot enverra le message de bienvenue.\n\nRôle actuel : ${configuration.newMembeRoleId ? `<@&${configuration.newMembeRoleId}>` : "aucun"}\nSalon actuel : ${configuration.welcomeChannelId ? `<#${configuration.welcomeChannelId}>` : "salon système du serveur"}`,
        ))
        .addSeparatorComponents(separator())
        .addActionRowComponents(new ActionRowBuilder().addComponents(roleMenu))
        .addActionRowComponents(new ActionRowBuilder().addComponents(channelMenu))
        .addActionRowComponents(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("button-parameters:save:welcome").setLabel("Enregistrer").setEmoji("💾").setStyle(ButtonStyle.Success),
        ));
}

function buildOfficersPanel(configuration) {
    const menu = new RoleSelectMenuBuilder()
        .setCustomId("select-parameters:officer-roles")
        .setPlaceholder("Choisis les rôles officiers")
        .setMinValues(0)
        .setMaxValues(25)
        .setDefaultRoles(configuration.officerRoleIds);
    const currentRoles = configuration.officerRoleIds.length
        ? configuration.officerRoleIds.map((id) => `<@&${id}>`).join(", ")
        : "aucun";

    return new ContainerBuilder()
        .setAccentColor(toColorInt(color.orange))
        .addSectionComponents(new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("## 🛡️ Espace officier"))
            .setButtonAccessory(new ButtonBuilder().setCustomId("button-parameters:return").setLabel("Retour").setEmoji("↩️").setStyle(ButtonStyle.Secondary)),
        )
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `Choisis un ou plusieurs rôles. Leurs membres pourront modifier le Gear Score d'autres membres et gérer les messages du bot.\n\nRôles actuels : ${currentRoles}`,
        ))
        .addSeparatorComponents(separator())
        .addActionRowComponents(new ActionRowBuilder().addComponents(menu))
        .addActionRowComponents(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("button-parameters:save:officers").setLabel("Enregistrer").setEmoji("💾").setStyle(ButtonStyle.Success),
        ));
}

module.exports = { buildSettingsHome, buildWelcomePanel, buildOfficersPanel };
