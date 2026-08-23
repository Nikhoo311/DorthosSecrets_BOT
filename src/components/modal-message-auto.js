const { ModalBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require("discord.js");
const { FileUploadBuilder, LabelBuilder } = require("@discordjs/builders");
const ms = require("ms");
const config = require("../../config/config.json");
const { hasOfficierRole } = require("../modules/stuff/players.js");
const { createAutomaticMessage } = require("../modules/messagesAuto/messagesAuto.js");
const { buildColorOptions } = require("../functions/utils/colorOptions.js");

const MIN_DURATION_MS = 60 * 1000;

function parseDuration(input) {
    const value = input.replace(",", ".").trim();
    const segmentPattern = /(\d+(?:\.\d+)?)\s*(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|min|m|hours?|hrs?|hr|h|days?|d|weeks?|w|years?|yrs?|yr|y)/gi;
    let durationMs = 0;
    let cursor = 0;
    let match;

    while ((match = segmentPattern.exec(value)) !== null) {
        if (value.slice(cursor, match.index).trim()) return null;
        const segmentMs = ms(`${match[1]}${match[2]}`);
        if (!Number.isFinite(segmentMs)) return null;
        durationMs += segmentMs;
        cursor = segmentPattern.lastIndex;
    }

    return cursor !== 0 && !value.slice(cursor).trim() ? durationMs : null;
}

function createModal(channelId) {
    const title = new TextInputBuilder().setCustomId("title").setStyle(TextInputStyle.Short);
    // LabelBuilder permet d'utiliser les composants Modal récents de Discord.
    title.setPlaceholder("Ex: Réunion de guilde").setMaxLength(256).setRequired(true);
    const description = new TextInputBuilder().setCustomId("description").setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Le contenu du message").setMaxLength(4000).setRequired(true);
    const duration = new TextInputBuilder().setCustomId("duration").setStyle(TextInputStyle.Short)
        .setPlaceholder("Ex: 2h30min, 2h 30min, 2min1s").setMaxLength(20).setRequired(true);
    const image = new FileUploadBuilder().setCustomId("image").setMinValues(0).setMaxValues(1).setRequired(false);
    const accentColor = new StringSelectMenuBuilder()
        .setCustomId("accentColor")
        .setPlaceholder("Choisis une couleur")
        .setMinValues(0)
        .setMaxValues(1)
        .setRequired(false)
        .addOptions(buildColorOptions(config.color));

    return new ModalBuilder()
        .setCustomId(`modal-message-auto:${channelId}`)
        .setTitle("Créer un message automatique")
        .addLabelComponents(
            new LabelBuilder()
                .setLabel("Fréquence")
                .setDescription("Minimum 1 min. Unités : s, min, h, d, w, y.")
                .setTextInputComponent(duration),
            new LabelBuilder().setLabel("Couleur du message").setStringSelectMenuComponent(accentColor),
            new LabelBuilder().setLabel("Titre").setTextInputComponent(title),
            new LabelBuilder().setLabel("Description").setTextInputComponent(description),
            new LabelBuilder().setLabel("Image").setFileUploadComponent(image),
        );
}

async function showAutomaticMessageModal(interaction, channelId) {
    return interaction.showModal(createModal(channelId));
}

module.exports = {
    data: { name: "modal-message-auto", type: "modal", multi: "modal-message-auto" },
    showAutomaticMessageModal,
    parseDuration,
    MIN_DURATION_MS,
    async execute(interaction) {
        if (!hasOfficierRole(interaction.member, config.officerRoleIds)) {
            await interaction.reply({ content: "❌ Seuls les officiers peuvent créer des messages automatiques.", flags: MessageFlags.Ephemeral });
            return;
        }

        const [, channelId] = interaction.customId.split(":");
        if (!channelId) {
            await interaction.reply({ content: "❌ Le salon de destination est manquant.", flags: MessageFlags.Ephemeral });
            return;
        }

        const title = interaction.fields.getTextInputValue("title").trim();
        const description = interaction.fields.getTextInputValue("description").trim();
        const durationInput = interaction.fields.getTextInputValue("duration").trim();
        const durationMs = parseDuration(durationInput);
        const [colorName] = interaction.fields.getStringSelectValues("accentColor");
        const accentColor = config.color[colorName];
        if (!title || !description || !Number.isFinite(durationMs) || durationMs < MIN_DURATION_MS) {
            await interaction.reply({
                content: "❌ Renseigne un titre, une description et une durée valide d’au moins 1 minute (ex. `1d`, `12h`, `1w`).",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const uploadedFiles = interaction.fields.getUploadedFiles("image", false);
        const imageUrl = uploadedFiles?.first()?.url ?? null;
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        try {
            const message = await createAutomaticMessage({
                guildId: interaction.guildId,
                channelId,
                title,
                description,
                imageUrl,
                ...(accentColor ? { accentColor } : {}),
                durationMs,
                createdBy: interaction.user.id,
            });
            interaction.client.messagesAuto.set(message.id, message);
            await interaction.editReply(`✅ Message automatique créé dans <#${message.channelId}>. Première publication dans ${durationInput}.`);
        } catch (error) {
            console.error("Erreur création message automatique:", error);
            await interaction.editReply("❌ Impossible d’enregistrer le message automatique. Réessaie dans quelques secondes.");
        }
    },
};
