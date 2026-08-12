const { SlashCommandBuilder } = require("discord.js");
const { searchSite } = require("../../search/pagefind.js");
const { buildResultMessage } = require("../../search/resultMessage.js");

module.exports = {
    name: "recherche",
    active: true,
    data: new SlashCommandBuilder()
        .setName("recherche")
        .setDescription("Recherche dans les guides Dorthos Secrets")
        .addStringOption((opt) =>
            opt.setName("terme").setDescription("Ce que tu cherches").setRequired(true)
        ),

    async execute(interaction) {
        const query = interaction.options.getString("terme");
        await interaction.deferReply();

        try {
            const results = await searchSite(query, 1);
            await interaction.editReply(buildResultMessage(results[0], query));
        } catch (err) {
            console.error("Erreur recherche Pagefind:", err);
            await interaction.editReply("La recherche a échoué, réessaie dans quelques secondes.");
        }
    },
};
