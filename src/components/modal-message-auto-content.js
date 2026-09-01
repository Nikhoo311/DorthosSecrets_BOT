const { MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const { FileUploadBuilder, LabelBuilder } = require("@discordjs/builders");
const { getGuildConfiguration } = require("../modules/configuration/configuration.js");
const { createAutomaticMessage } = require("../modules/messagesAuto/messagesAuto.js");
const { hasOfficierRole } = require("../modules/stuff/players.js");

function buildModal(channelId) {
    const title = new TextInputBuilder()
        .setCustomId("title")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    const description = new TextInputBuilder()
        .setCustomId("description")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);
    const image = new FileUploadBuilder()
        .setCustomId("image")
        .setMinValues(0)
        .setMaxValues(1)
        .setRequired(false);

    return new ModalBuilder()
        .setCustomId(`modal-message-auto-content:${channelId}`)
        .setTitle("Contenu du message")
        .addLabelComponents(
            new LabelBuilder().setLabel("Titre").setTextInputComponent(title),
            new LabelBuilder().setLabel("Description").setTextInputComponent(description),
            new LabelBuilder().setLabel("Image").setFileUploadComponent(image),
        );
}

module.exports = {
    data: { name: "modal-message-auto-content", type: "modal", multi: "modal-message-auto-content" },
    showAutomaticMessageContentModal: (interaction, channelId) => interaction.showModal(buildModal(channelId)),
    async execute(interaction) {
        const configuration = await getGuildConfiguration(interaction.guildId);
        if (!hasOfficierRole(interaction.member, configuration.officerRoleIds)) {
            return interaction.reply({ content: "❌ Accès refusé.", flags: MessageFlags.Ephemeral });
        }

        const [, channelId] = interaction.customId.split(":");
        const key = `${interaction.user.id}:${channelId}`;
        const pending = interaction.client.pendingAutomaticMessageCreations.get(key);
        const title = interaction.fields.getTextInputValue("title").trim();
        const description = interaction.fields.getTextInputValue("description").trim();

        if (!pending || !title || !description) {
            return interaction.reply({
                content: "❌ Création expirée ou invalide.",
                flags: MessageFlags.Ephemeral,
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const upload = interaction.fields.getUploadedFiles("image", false)?.first();
        let message;
        try {
            message = await createAutomaticMessage({
            guildId: interaction.guildId,
            ...pending,
            title,
            description,
            imageUpload: upload ? { url: upload.url, contentType: upload.contentType } : null,
            createdBy: interaction.user.id,
            });
        } catch (error) {
            console.error("Erreur lors de l'enregistrement de l'image du message automatique:", error);
            return interaction.editReply("❌ Impossible d'enregistrer l'image du message automatique.");
        }
        interaction.client.messagesAuto.set(message.id, message);
        interaction.client.pendingAutomaticMessageCreations.delete(key);

        const firstSend = pending.startAt
            ? `<t:${Math.floor(pending.startAt / 1000)}:F>`
            : `dans ${pending.durationInput}`;
        await interaction.editReply(`✅ Message créé. Premier envoi ${firstSend}.`);
    },
};
