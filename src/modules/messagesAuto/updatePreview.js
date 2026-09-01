const { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, TextDisplayBuilder } = require("discord.js");
const { readFile } = require("fs/promises");
const path = require("path");
const { buildAutomaticMessageContainer } = require("./messagesAuto.js");

async function buildUpdatePreview(message, stage) {
    const label = stage === "first" ? "Aperçu des premières modifications"
        : stage === "continue" ? "Aperçu mis à jour des modifications"
            : "Aperçu final des modifications";
    const files = [];
    let previewMessage = message;
    if (message.imagePreviewUrl) {
        previewMessage = { ...message, imageUrl: message.imagePreviewUrl };
    } else if (message.imagePath) {
        try {
            const fileName = message.imageName ?? "message-auto-image";
            files.push(new AttachmentBuilder(
                await readFile(path.resolve(__dirname, "../../..", message.imagePath)),
                { name: fileName },
            ));
            previewMessage = { ...message, imageUrl: `attachment://${fileName}` };
        } catch (error) {
            console.warn("Impossible de charger l'image de l'aperçu:", error.message);
            previewMessage = { ...message, imageUrl: null };
        }
    }
    const container = buildAutomaticMessageContainer(previewMessage)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`\n**${label}**`));
    const buttons = [new ButtonBuilder().setCustomId(`button-message-auto:save:${message.id}`).setLabel("Enregistrer").setEmoji("💾").setStyle(ButtonStyle.Success)];
    if (stage !== "final") buttons.push(new ButtonBuilder().setCustomId(`button-message-auto:continue:${message.id}`).setLabel("Continuer les modifications").setEmoji("➡️").setStyle(ButtonStyle.Secondary));
    return {
        components: [container.addActionRowComponents(new ActionRowBuilder().addComponents(buttons))],
        files,
    };
}

module.exports = { buildUpdatePreview };
