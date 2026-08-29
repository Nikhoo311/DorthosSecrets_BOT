const { ModalBuilder, StringSelectMenuBuilder, MessageFlags } = require("discord.js");
const { LabelBuilder } = require("@discordjs/builders");
const config = require("../../config/config.json");
const { hasOfficierRole } = require("../modules/stuff/players.js");
const { getGuildConfiguration } = require("../modules/configuration/configuration.js");
const { buildUpdatePreview } = require("../modules/messagesAuto/updatePreview.js");
const { buildColorOptions } = require("../functions/utils/colorOptions.js");

function createModal(message) {
    const color = new StringSelectMenuBuilder()
        .setCustomId("accentColor")
        .setPlaceholder("Conserver la couleur actuelle si vide")
        .setMinValues(0)
        .setMaxValues(1)
        .setRequired(false)
        .addOptions(buildColorOptions(config.color, message.accentColor));
    return new ModalBuilder()
        .setCustomId(`modal-message-auto-update-color:${message.id}`)
        .setTitle("Couleur du message")
        .addLabelComponents(
            new LabelBuilder().setLabel("Couleur d'accent").setDescription("Dernière étape : la validation enregistre toutes les modifications.").setStringSelectMenuComponent(color),
        );
}

async function showAutomaticMessageUpdateColorModal(interaction, message) {
    return interaction.showModal(createModal(message));
}

module.exports = {
    data: { name: "modal-message-auto-update-color", type: "modal", multi: "modal-message-auto-update-color" },
    showAutomaticMessageUpdateColorModal,
    async execute(interaction) {
        const configuration = await getGuildConfiguration(interaction.guildId);
        if (!hasOfficierRole(interaction.member, configuration.officerRoleIds)) return interaction.reply({ content: "❌ Accès refusé.", flags: MessageFlags.Ephemeral });
        const [, messageId] = interaction.customId.split(":");
        const pendingKey = `${interaction.user.id}:${messageId}`;
        const pending = interaction.client.pendingAutomaticMessageUpdates.get(pendingKey);
        const current = interaction.client.messagesAuto.get(messageId);
        if (!pending || !current) return interaction.reply({ content: "❌ Cette édition a expiré. Recommence avec `/message-auto modifier`.", flags: MessageFlags.Ephemeral });

        const [colorName] = interaction.fields.getStringSelectValues("accentColor");
        const accentColor = config.color[colorName] ?? null;
        const updates = { ...pending, accentColor };
        interaction.client.pendingAutomaticMessageUpdates.set(pendingKey, updates);
        await interaction.update({
            components: [buildUpdatePreview({ ...current, ...updates, id: messageId }, "continue")],
        });
    },
};
