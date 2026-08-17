const { ContainerBuilder, MessageFlags, TextDisplayBuilder } = require("discord.js");
const { searchSite } = require("../../search/siteIndex.js");
const { buildResultMessage } = require("../../search/resultMessage.js");

const SEARCH_ERROR_MESSAGE = {
    components: [
        new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent("La recherche a échoué, réessaie dans quelques secondes."),
        ),
    ],
    flags: MessageFlags.IsComponentsV2,
};

async function updateSearchResult(interaction, message) {
    try {
        await interaction.editReply(message);
    } catch (error) {
        if (error.code !== 10008) throw error;
        await interaction.followUp({
            ...message,
            flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        });
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

        if (interaction.message) {
            await interaction.deferUpdate();
        } else {
            await interaction.deferReply({ flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral] });
        }

        try {
            const results = await searchSite(query, { limit: 1, tag: tag === "tout" ? undefined : tag });
            await updateSearchResult(interaction, buildResultMessage(results[0], query));
        } catch (err) {
            console.error("Erreur recherche index JSON:", err);
            try {
                await updateSearchResult(interaction, SEARCH_ERROR_MESSAGE);
            } catch (replyError) {
                console.error("Impossible d'envoyer le message d'erreur de recherche:", replyError);
            }
        }
    },
};
