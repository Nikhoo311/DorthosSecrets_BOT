const { ChannelSelectMenuBuilder, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require("discord.js");
const { FileUploadBuilder, LabelBuilder } = require("@discordjs/builders");
const config = require("../../config/config.json");
const { hasOfficierRole } = require("../modules/stuff/players.js");
const { getGuildConfiguration } = require("../modules/configuration/configuration.js");
const { MIN_DURATION_MS, parseDuration } = require("./modal-message-auto.js");
const { storeAutomaticMessageImage } = require("../modules/messagesAuto/messagesAuto.js");
const { buildUpdatePreview } = require("../modules/messagesAuto/updatePreview.js");

function durationInputValue(durationMs) {
    if (durationMs % 86400000 === 0) return `${durationMs / 86400000}d`;
    if (durationMs % 3600000 === 0) return `${durationMs / 3600000}h`;
    if (durationMs % 60000 === 0) return `${durationMs / 60000}min`;
    return `${durationMs / 1000}s`;
}

function createModal(message, channelName) {
    const duration = new TextInputBuilder().setCustomId("duration").setStyle(TextInputStyle.Short)
        .setValue(durationInputValue(message.durationMs)).setPlaceholder("Ex: 2h30min, 2h 30min, 2min1s").setRequired(true);
    const title = new TextInputBuilder().setCustomId("title").setStyle(TextInputStyle.Short)
        .setValue(message.title).setMaxLength(256).setRequired(true);
    const description = new TextInputBuilder().setCustomId("description").setStyle(TextInputStyle.Paragraph)
        .setValue(message.description).setMaxLength(4000).setRequired(true);
    const image = new FileUploadBuilder().setCustomId("image").setMinValues(0).setMaxValues(1).setRequired(false);
    const channel = new ChannelSelectMenuBuilder().setCustomId("channel")
        .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setDefaultChannels(message.channelId).setRequired(false);

    return new ModalBuilder().setCustomId(`modal-message-auto-update:${message.id}`).setTitle("Modifier un message automatique")
        .addLabelComponents(
            new LabelBuilder().setLabel("Salon de destination").setDescription(`Si vide : conserve #${channelName ?? message.channelId}.`).setChannelSelectMenuComponent(channel),
            new LabelBuilder().setLabel("Fréquence").setDescription("Minimum 1 min. Unités : s, min, h, d, w, y.").setTextInputComponent(duration),
            new LabelBuilder().setLabel("Titre").setTextInputComponent(title),
            new LabelBuilder().setLabel("Description").setTextInputComponent(description),
            new LabelBuilder().setLabel("Nouvelle image").setDescription("Si vide, l'image actuelle ne change pas.").setFileUploadComponent(image),
        );
}

async function showAutomaticMessageUpdateModal(interaction, message) {
    const channel = interaction.client.channels.cache.get(message.channelId)
        ?? await interaction.client.channels.fetch(message.channelId).catch(() => null);
    return interaction.showModal(createModal(message, channel?.name));
}

module.exports = {
    data: { name: "modal-message-auto-update", type: "modal", multi: "modal-message-auto-update" },
    showAutomaticMessageUpdateModal,
    async execute(interaction) {
        const configuration = await getGuildConfiguration(interaction.guildId);
        if (!hasOfficierRole(interaction.member, configuration.officerRoleIds)) return interaction.reply({ content: "❌ Accès refusé.", flags: MessageFlags.Ephemeral });
        const [, messageId] = interaction.customId.split(":");
        const current = interaction.client.messagesAuto.get(messageId);
        if (!current) return interaction.reply({ content: "❌ Ce message n'existe plus.", flags: MessageFlags.Ephemeral });

        const title = interaction.fields.getTextInputValue("title").trim();
        const description = interaction.fields.getTextInputValue("description").trim();
        const durationMs = parseDuration(interaction.fields.getTextInputValue("duration").trim());
        if (!title || !description || !Number.isFinite(durationMs) || durationMs < MIN_DURATION_MS) {
            return interaction.reply({ content: "❌ Renseigne un titre, une description et une durée valide d'au moins 1 minute.", flags: MessageFlags.Ephemeral });
        }

        const selectedChannels = interaction.fields.getSelectedChannels("channel", false);
        const upload = interaction.fields.getUploadedFiles("image", false)?.first();
        let storedImage = { imagePath: current.imagePath ?? null, imageName: current.imageName ?? null };
        try {
            if (upload) storedImage = await storeAutomaticMessageImage(upload.url, interaction.guildId, upload.contentType);
        } catch (error) {
            const content = error.message === "IMAGE_TOO_LARGE"
                ? "❌ L'image est trop lourde après optimisation."
                : "❌ Impossible d'enregistrer cette image.";
            return interaction.reply({ content, flags: MessageFlags.Ephemeral });
        }
        const pendingKey = `${interaction.user.id}:${messageId}`;
        interaction.client.pendingAutomaticMessageUpdates.set(pendingKey, {
            title,
            description,
            durationMs,
            durationInput: interaction.fields.getTextInputValue("duration").trim(),
            channelId: selectedChannels?.first()?.id ?? current.channelId,
            imageUrl: upload ? null : current.imageUrl,
            ...storedImage,
        });
        setTimeout(() => interaction.client.pendingAutomaticMessageUpdates.delete(pendingKey), 15 * 60 * 1000).unref();
        const pending = interaction.client.pendingAutomaticMessageUpdates.get(pendingKey);
        await interaction.reply({
            components: [buildUpdatePreview({ ...current, ...pending, id: messageId }, "first")],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
    },
};
