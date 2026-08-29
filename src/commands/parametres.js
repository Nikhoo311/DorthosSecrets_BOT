const { MessageFlags, SlashCommandBuilder } = require("discord.js");
const { buildSettingsHome } = require("../modules/configuration/panel.js");

module.exports = {
    name: "paramètres",
    active: true,
    data: new SlashCommandBuilder()
        .setName("paramètres")
        .setDescription("Configure le bot pour ce serveur"),
    async execute(interaction) {
        // if (!interaction.guild || interaction.user.id !== interaction.guild.ownerId) {
        //     return interaction.reply({ content: "❌ Seul le propriétaire du serveur peut modifier les paramètres.", flags: MessageFlags.Ephemeral });
        // }
        await interaction.reply({
            components: [buildSettingsHome()],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
    },
};
