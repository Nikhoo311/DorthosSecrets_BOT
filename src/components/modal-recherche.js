const { searchSite } = require("../../search/pagefind.js");
const { buildResultMessage } = require("../../search/resultMessage.js");

module.exports = {
    data: {
        name: "modal-recherche",
        type: "modal",
    },
    async execute(interaction) {
        const query = interaction.fields.getTextInputValue("terme");
        const [category = "tout"] = interaction.fields.getStringSelectValues("recherche-categorie");
        await interaction.deferUpdate();

        try {
            const results = await searchSite(query, 1, category);
            await interaction.editReply(buildResultMessage(results[0], query));
        } catch (err) {
            console.error("Erreur recherche Pagefind:", err);
            await interaction.editReply({
                content: "La recherche a échoué, réessaie dans quelques secondes.",
                embeds: [],
                components: [],
            });
        }
    },
};
