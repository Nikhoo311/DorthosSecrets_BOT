const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    MessageFlags,
    StringSelectMenuBuilder,
    TextDisplayBuilder,
} = require("discord.js");
const config = require("../../config/config.json");
const { hasOfficierRole } = require("../modules/stuff/players.js");
const { buildAutomaticMessageContainer } = require("../modules/messagesAuto/messagesAuto.js");
const { showAutomaticMessageUpdateModal } = require("./modal-message-auto-update.js");

function formatDuration(durationMs) {
    if (durationMs % 86400000 === 0) return `${durationMs / 86400000} j`;
    if (durationMs % 3600000 === 0) return `${durationMs / 3600000} h`;
    if (durationMs % 60000 === 0) return `${durationMs / 60000} min`;
    return `${Math.round(durationMs / 1000)} s`;
}

async function showAutomaticMessageSelect(interaction, action) {
    const messages = [...interaction.client.messagesAuto.values()].slice(0, 25);
    if (!messages.length) {
        await interaction.reply({ content: "❌ Aucun message automatique n'est enregistré.", flags: MessageFlags.Ephemeral });
        return;
    }

    const options = await Promise.all(messages.map(async (message) => {
        const channel = interaction.client.channels.cache.get(message.channelId)
            ?? await interaction.client.channels.fetch(message.channelId).catch(() => null);
        return {
            label: message.title.slice(0, 100),
            value: message.id,
            description: `${formatDuration(message.durationMs)} · Salon #${channel?.name ?? message.channelId}`.slice(0, 100),
        };
    }));

    const select = new StringSelectMenuBuilder()
        .setCustomId(`select-message-auto:${action}`)
        .setPlaceholder("Sélectionne un message")
        .addOptions(options);

    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            action === "delete" ? "## Supprimer un message automatique" : "## Modifier un message automatique",
        ))
        .addActionRowComponents(new ActionRowBuilder().addComponents(select));
    await interaction.reply({ components: [container], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
}

module.exports = {
    data: { name: "select-message-auto", type: "selectMenu", multi: "select-message-auto" },
    showAutomaticMessageSelect,
    async execute(interaction) {
        if (!hasOfficierRole(interaction.member, config.officerRoleIds)) return interaction.reply({ content: "❌ Accès refusé.", flags: MessageFlags.Ephemeral });
        const [, action] = interaction.customId.split(":");
        const message = interaction.client.messagesAuto.get(interaction.values[0]);
        if (!message) return interaction.update({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent("Ce message n'existe plus."))] });

        if (action === "update") return showAutomaticMessageUpdateModal(interaction, message);

        const preview = buildAutomaticMessageContainer(message)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("\n**Confirmer la suppression de ce message ?**"))
            .addActionRowComponents(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`button-message-auto:delete:${message.id}`).setLabel("Oui, supprimer").setEmoji("🗑️").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId("button-message-auto:cancel").setLabel("Non, annuler").setEmoji("❌").setStyle(ButtonStyle.Secondary),
            ));
        await interaction.update({ components: [preview], flags: MessageFlags.IsComponentsV2 });
    },
};
