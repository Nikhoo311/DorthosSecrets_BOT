const { MessageFlags } = require("discord.js");
const { getGuildConfiguration, updateGuildConfiguration } = require("../modules/configuration/configuration.js");
const { buildOfficersPanel, buildSettingsHome, buildWelcomePanel } = require("../modules/configuration/panel.js");

module.exports = {
    data: { name: "button-parameters", type: "button", multi: "button-parameters" },
    async execute(interaction) {
        // if (!interaction.guild || interaction.user.id !== interaction.guild.ownerId) {
        //     return interaction.reply({ content: "❌ Seul le propriétaire du serveur peut modifier les paramètres.", flags: MessageFlags.Ephemeral });
        // }

        const [, action, category] = interaction.customId.split(":");
        if (action === "return") {
            interaction.client.pendingConfigurationUpdates.delete(`${interaction.user.id}:${interaction.guildId}`);
            return interaction.update({ components: [buildSettingsHome()], flags: MessageFlags.IsComponentsV2 });
        }
        if (action !== "save") return;
        const key = `${interaction.user.id}:${interaction.guildId}`;
        const pending = interaction.client.pendingConfigurationUpdates.get(key)
            ?? await getGuildConfiguration(interaction.guildId);
        const updates = category === "welcome"
            ? { newMembeRoleId: pending.newMembeRoleId, welcomeChannelId: pending.welcomeChannelId }
            : { officerRoleIds: pending.officerRoleIds };

        try {
            const configuration = await updateGuildConfiguration(interaction.guildId, updates);
            interaction.client.pendingConfigurationUpdates.delete(key);
            const panel = category === "welcome"
                ? buildWelcomePanel(configuration)
                : buildOfficersPanel(configuration);
            await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2 });
            await interaction.followUp({ content: "✅ Paramètres enregistrés.", flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error("Erreur d'enregistrement des paramètres:", error);
            await interaction.reply({ content: "❌ Impossible d'enregistrer les paramètres. Réessaie dans quelques secondes.", flags: MessageFlags.Ephemeral });
        }
    },
};
