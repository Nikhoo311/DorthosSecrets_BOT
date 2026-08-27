const { MessageFlags, SlashCommandBuilder } = require("discord.js");
const { buildWelcomeMessage } = require("../modules/welcome/resultMessage.js");

module.exports = {
    name: "test-bienvenue",
    active: true,
    data: new SlashCommandBuilder()
        .setName("test-bienvenue")
        .setDescription("Génère un aperçu éphémère de ton image de bienvenue")
        .setDMPermission(false),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
        const member = await interaction.guild.members.fetch(interaction.user.id);
        await interaction.editReply(await buildWelcomeMessage(member));
    },
};
