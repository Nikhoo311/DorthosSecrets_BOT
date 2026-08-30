const { MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const { FileUploadBuilder, LabelBuilder } = require("@discordjs/builders");
const { getGuildConfiguration } = require("../modules/configuration/configuration.js");
const { createAutomaticMessage, storeAutomaticMessageImage } = require("../modules/messagesAuto/messagesAuto.js");
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
        let storedImage = { imagePath: null, imageName: null };
        try {
            const upload = interaction.fields.getUploadedFiles("image", false)?.first();
            storedImage = await storeAutomaticMessageImage(
                upload?.url ?? null,
                interaction.guildId,
                upload?.contentType,
            );
        } catch (error) {
            console.error("Erreur lors de l'enregistrement de l'image du message automatique:", error);
            const content = error.message === "IMAGE_TOO_LARGE"
                ? "❌ L'image est trop lourde après optimisation."
                : "❌ Impossible d'enregistrer l'image du message automatique.";
            return interaction.editReply(content);
        }
        const message = await createAutomaticMessage({
            guildId: interaction.guildId,
            ...pending,
            title,
            description,
            ...storedImage,
            createdBy: interaction.user.id,
        });
        interaction.client.messagesAuto.set(message.id, message);
        interaction.client.pendingAutomaticMessageCreations.delete(key);

        const firstSend = pending.startAt
            ? `<t:${Math.floor(pending.startAt / 1000)}:F>`
            : `dans ${pending.durationInput}`;
        await interaction.editReply(`✅ Message créé. Premier envoi ${firstSend}.`);
    },
};
