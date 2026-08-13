const { searchSite } = require("../../search/pagefind.js");
const { buildResultMessage } = require("../../search/resultMessage.js");

const SEARCH_ERROR_MESSAGE = {
    content: "La recherche a échoué, réessaie dans quelques secondes.",
    embeds: [],
    components: [],
};

async function updateSearchResult(interaction, message) {
    if (!interaction.message) {
        try {
            await interaction.editReply(message);
        } catch (error) {
            if (error.code !== 10008) throw error;
            await interaction.followUp(message);
        }
        return;
    }

    try {
        await interaction.message.edit(message);
    } catch (error) {
        if (error.code !== 10008) throw error;
        await interaction.followUp(message);
    }
}

module.exports = {
    data: {
        name: "modal-recherche",
        type: "modal",
    },
    async execute(interaction) {
        const query = interaction.fields.getTextInputValue("terme");
        const [tag] = interaction.fields.getStringSelectValues("recherche-categorie");
        const updatesExistingMessage = Boolean(interaction.message);

        if (updatesExistingMessage) {
            await interaction.deferUpdate();
        } else {
            await interaction.deferReply();
        }

        try {
            const results = await searchSite(query, { limit: 1, tag: tag === "tout" ? undefined : tag });
            await updateSearchResult(interaction, buildResultMessage(results[0], query));
        } catch (err) {
            console.error("Erreur recherche Pagefind:", err);
            try {
                await updateSearchResult(interaction, SEARCH_ERROR_MESSAGE);
            } catch (replyError) {
                console.error("Impossible d'envoyer le message d'erreur de recherche:", replyError);
            }
        }
    },
};
