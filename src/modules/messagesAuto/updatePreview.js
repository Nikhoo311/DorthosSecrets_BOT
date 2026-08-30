const { ActionRowBuilder, ButtonBuilder, ButtonStyle, TextDisplayBuilder } = require("discord.js");
const { buildAutomaticMessageContainer } = require("./messagesAuto.js");

function buildUpdatePreview(message, stage) {
    const label = stage === "first" ? "Aperçu des premières modifications"
        : stage === "continue" ? "Aperçu mis à jour des modifications"
            : "Aperçu final des modifications";
    const previewMessage = message.imageUrl?.startsWith("data:image/")
        ? { ...message, imageUrl: null }
        : message;
    const container = buildAutomaticMessageContainer(previewMessage)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`\n**${label}**`));
    const buttons = [new ButtonBuilder().setCustomId(`button-message-auto:save:${message.id}`).setLabel("Enregistrer").setEmoji("💾").setStyle(ButtonStyle.Success)];
    if (stage !== "final") buttons.push(new ButtonBuilder().setCustomId(`button-message-auto:continue:${message.id}`).setLabel("Continuer les modifications").setEmoji("➡️").setStyle(ButtonStyle.Secondary));
    return container.addActionRowComponents(new ActionRowBuilder().addComponents(buttons));
}

module.exports = { buildUpdatePreview };
