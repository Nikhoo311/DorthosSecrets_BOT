const { MessageFlags } = require("discord.js");
const { getGuildConfiguration } = require("../modules/configuration/configuration.js");
const { buildOfficersPanel, buildWelcomePanel } = require("../modules/configuration/panel.js");

module.exports = {
    data: { name: "select-parameters", type: "selectMenu", multi: "select-parameters" },
    async execute(interaction) {
        if (!interaction.guild || interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ content: "❌ Seul le propriétaire du serveur peut modifier les paramètres.", flags: MessageFlags.Ephemeral });
        }

        const action = interaction.customId.split(":")[1];
        try {
            if (action === "category") {
                const configuration = await getGuildConfiguration(interaction.guildId);
                interaction.client.pendingConfigurationUpdates.set(`${interaction.user.id}:${interaction.guildId}`, configuration);
                const panel = interaction.values[0] === "welcome"
                    ? buildWelcomePanel(configuration)
                    : buildOfficersPanel(configuration);
                return interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2 });
            }

            const value = interaction.values[0] ?? null;
            const key = `${interaction.user.id}:${interaction.guildId}`;
            const pending = interaction.client.pendingConfigurationUpdates.get(key)
                ?? await getGuildConfiguration(interaction.guildId);
            const updates = action === "welcome-role"
                ? { newMembeRoleId: value }
                : action === "welcome-channel"
                    ? { welcomeChannelId: value }
                    : { officerRoleIds: interaction.values };
            const configuration = { ...pending, ...updates };
            interaction.client.pendingConfigurationUpdates.set(key, configuration);
            const panel = action === "officer-roles"
                ? buildOfficersPanel(configuration)
                : buildWelcomePanel(configuration);
            await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            console.error("Erreur de mise à jour des paramètres:", error);
            if (interaction.replied || interaction.deferred) return;
            await interaction.reply({ content: "❌ Impossible d'enregistrer ce paramètre. Réessaie dans quelques secondes.", flags: MessageFlags.Ephemeral });
        }
    },
};
