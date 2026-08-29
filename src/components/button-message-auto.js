const { ContainerBuilder, MessageFlags, TextDisplayBuilder } = require("discord.js");
const { Timestamp } = require("firebase-admin/firestore");
const { color } = require("../../config/config.json");
const { hasOfficierRole } = require("../modules/stuff/players.js");
const { getGuildConfiguration } = require("../modules/configuration/configuration.js");
const { deleteAutomaticMessage, updateAutomaticMessage } = require("../modules/messagesAuto/messagesAuto.js");
const { showAutomaticMessageUpdateColorModal } = require("./modal-message-auto-update-color.js");
const { showAutomaticMessageContentModal } = require("./modal-message-auto-content.js");

function response(text, accentColor) {
    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    if (accentColor) container.setAccentColor(parseInt(accentColor.replace("#", ""), 16));
    return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

module.exports = {
    data: { name: "button-message-auto", type: "button", multi: "button-message-auto" },
    async execute(interaction) {
        const configuration = await getGuildConfiguration(interaction.guildId);
        if (!hasOfficierRole(interaction.member, configuration.officerRoleIds)) return interaction.reply({ content: "❌ Accès refusé.", flags: MessageFlags.Ephemeral });
        const [, action, messageId] = interaction.customId.split(":");
        if (action === "cancel") return interaction.update(response("Suppression annulée."));

        if (action === "continue" && messageId) {
            const message = interaction.client.messagesAuto.get(messageId);
            if (!message) return interaction.update(response("Ce message n'existe plus."));
            return showAutomaticMessageUpdateColorModal(interaction, message);
        }

        if (action === "create-content" && messageId) {
            return showAutomaticMessageContentModal(interaction, messageId);
        }

        if (action === "save" && messageId) {
            const pendingKey = `${interaction.user.id}:${messageId}`;
            const pending = interaction.client.pendingAutomaticMessageUpdates.get(pendingKey);
            if (!pending) return interaction.update(response("Cette édition a expiré. Recommence avec `/message-auto modifier`."));
            try {
                const message = await updateAutomaticMessage(interaction.client, messageId, {
                    ...pending,
                    nextSendAt: Timestamp.fromMillis(Date.now() + pending.durationMs),
                });
                interaction.client.pendingAutomaticMessageUpdates.delete(pendingKey);
                return interaction.update(response(`✅ Message automatique modifié. Prochain envoi dans ${pending.durationInput} dans <#${message.channelId}>.`, color.green));
            } catch (error) {
                console.error("Erreur modification message automatique:", error);
                return interaction.update(response("❌ Impossible de modifier ce message."));
            }
        }

        if (action !== "delete" || !messageId || !interaction.client.messagesAuto.has(messageId)) return interaction.update(response("Ce message n'existe plus."));
        try {
            await deleteAutomaticMessage(interaction.client, messageId);
            await interaction.update(response("✅ Message automatique supprimé.", color.green));
        } catch (error) {
            console.error("Erreur suppression message automatique:", error);
            await interaction.update(response("❌ Impossible de supprimer ce message."));
        }
    },
};
