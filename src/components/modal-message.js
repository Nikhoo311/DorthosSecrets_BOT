const { ModalBuilder, StringSelectMenuBuilder, TextDisplayBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require("discord.js");
const { FileUploadBuilder, LabelBuilder } = require("@discordjs/builders");
const { color, officerRoleIds } = require("../../config/config.json");
const { hasOfficierRole } = require("../modules/stuff/players.js");
const { buildAutomaticMessageContainer } = require("../modules/messagesAuto/messagesAuto.js");
const { buildColorOptions } = require("../functions/utils/colorOptions.js");

function createModal(channelId) {
    const title = new TextInputBuilder().setCustomId("title").setStyle(TextInputStyle.Short)
        .setPlaceholder("Titre du message").setMaxLength(256).setRequired(true);
    const description = new TextInputBuilder().setCustomId("description").setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Contenu du message").setMaxLength(4000).setRequired(true);
    const image = new FileUploadBuilder().setCustomId("image").setMinValues(0).setMaxValues(1).setRequired(false);
    const accentColor = new StringSelectMenuBuilder().setCustomId("accentColor")
        .setPlaceholder("Choisis une couleur")
        .setMinValues(0).setMaxValues(1).setRequired(false)
        .addOptions(buildColorOptions(color));

    return new ModalBuilder().setCustomId(`modal-message:${channelId}`).setTitle("Envoyer un message")
        .addLabelComponents(
            new LabelBuilder().setLabel("Titre").setTextInputComponent(title),
            new LabelBuilder().setLabel("Description").setTextInputComponent(description),
            new LabelBuilder().setLabel("Image").setFileUploadComponent(image),
            new LabelBuilder().setLabel("Couleur").setStringSelectMenuComponent(accentColor),
        );
}

async function showMessageModal(interaction, channelId) {
    return interaction.showModal(createModal(channelId));
}

module.exports = {
    data: { name: "modal-message", type: "modal", multi: "modal-message" },
    showMessageModal,
    async execute(interaction) {
        if (!hasOfficierRole(interaction.member, officerRoleIds)) {
            await interaction.reply({ content: "❌ Accès refusé.", flags: MessageFlags.Ephemeral });
            return;
        }
        const [, channelId] = interaction.customId.split(":");
        const title = interaction.fields.getTextInputValue("title").trim();
        const description = interaction.fields.getTextInputValue("description").trim();
        const [colorName] = interaction.fields.getStringSelectValues("accentColor");
        if (!channelId || !title || !description) {
            await interaction.reply({ content: "❌ Le titre et la description sont obligatoires.", flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
        if (!channel?.isTextBased() || typeof channel.send !== "function") {
            await interaction.editReply("❌ Ce salon ne permet pas l'envoi de messages.");
            return;
        }

        const imageUrl = interaction.fields.getUploadedFiles("image", false)?.first()?.url ?? null;
        const accentColor = color[colorName] ?? null;
        try {
            await channel.send({
                components: [
                    new TextDisplayBuilder().setContent("||@everyone||"),
                    buildAutomaticMessageContainer({ title, description, imageUrl, accentColor }),
                ],
                flags: MessageFlags.IsComponentsV2,
            });
            await interaction.editReply("✅ Message envoyé.");
        } catch (error) {
            console.error("Erreur d'envoi du message:", error);
            await interaction.editReply("❌ Impossible d'envoyer le message.");
        }
    },
};
