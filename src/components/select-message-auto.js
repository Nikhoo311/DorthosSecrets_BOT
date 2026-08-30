const {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    MessageFlags,
    StringSelectMenuBuilder,
    TextDisplayBuilder,
} = require("discord.js");
const { readFile } = require("fs/promises");
const path = require("path");
const { hasOfficierRole } = require("../modules/stuff/players.js");
const { getGuildConfiguration } = require("../modules/configuration/configuration.js");
const { buildAutomaticMessageContainer } = require("../modules/messagesAuto/messagesAuto.js");
const { showAutomaticMessageUpdateModal } = require("./modal-message-auto-update.js");

function formatDuration(durationMs) {
    if (durationMs % 86400000 === 0) return `${durationMs / 86400000} j`;
    if (durationMs % 3600000 === 0) return `${durationMs / 3600000} h`;
    if (durationMs % 60000 === 0) return `${durationMs / 60000} min`;
    return `${Math.round(durationMs / 1000)} s`;
}

async function showAutomaticMessageSelect(interaction, action) {
    const messages = [...interaction.client.messagesAuto.values()]
        .filter((message) => message.guildId === interaction.guildId)
        .slice(0, 25);
    if (!messages.length) {
        return await interaction.reply({
            components: [new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder({ content: "❌ Aucun message automatique n'est enregistré."}),
            )],
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
        });
    }

    const options = messages.map((message) => {
        const channel = interaction.client.channels.cache.get(message.channelId);
        return {
            label: message.title.slice(0, 100),
            value: message.id,
            description: `${formatDuration(message.durationMs)} · Salon #${channel?.name ?? message.channelId}`.slice(0, 100),
        };
    });

    const select = new StringSelectMenuBuilder()
        .setCustomId(`select-message-auto:${action}`)
        .setPlaceholder("Sélectionne un message")
        .addOptions(options);

    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            action === "delete" ? "## Supprimer un message automatique" : "## Modifier un message automatique",
        ))
        .addActionRowComponents(new ActionRowBuilder().addComponents(select));
    await interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
}

module.exports = {
    data: { name: "select-message-auto", type: "selectMenu", multi: "select-message-auto" },
    showAutomaticMessageSelect,
    async execute(interaction) {
        const configuration = await getGuildConfiguration(interaction.guildId);
        if (!hasOfficierRole(interaction.member, configuration.officerRoleIds)) return interaction.reply({ content: "❌ Accès refusé.", flags: MessageFlags.Ephemeral });
        const [, action] = interaction.customId.split(":");
        const message = interaction.client.messagesAuto.get(interaction.values[0]);
        if (!message) return interaction.update({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent("Ce message n'existe plus."))] });

        if (action === "update") return showAutomaticMessageUpdateModal(interaction, message);

        const files = [];
        let previewMessage = message;
        if (message.imagePath) {
            try {
                const fileName = message.imageName ?? "message-auto-image";
                files.push(new AttachmentBuilder(
                    await readFile(path.resolve(__dirname, "../..", message.imagePath)),
                    { name: fileName },
                ));
                previewMessage = { ...message, imageUrl: `attachment://${fileName}` };
            } catch (error) {
                console.warn("Impossible de charger l'image de l'aperçu de suppression:", error.message);
                previewMessage = { ...message, imageUrl: null };
            }
        }

        const preview = buildAutomaticMessageContainer(previewMessage)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("\n**Confirmer la suppression de ce message ?**"))
            .addActionRowComponents(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`button-message-auto:delete:${message.id}`).setLabel("Oui, supprimer").setEmoji("🗑️").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId("button-message-auto:cancel").setLabel("Non, annuler").setEmoji("❌").setStyle(ButtonStyle.Secondary),
            ));
        await interaction.update({ components: [preview], files, flags: MessageFlags.IsComponentsV2 });
    },
};
