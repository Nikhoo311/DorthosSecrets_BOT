const { MessageFlags } = require("discord.js");
const players = require("../modules/stuff/players.js");
const { buildLeaderboard } = require("../modules/stuff/resultMessage.js");

async function withAvatars(playersList, client) {
    return Promise.all(
        playersList.map(async (player) => {
            try {
                const user = await client.users.fetch(player.discordId);
                return { ...player, avatarURL: user.displayAvatarURL({ extension: "png", size: 128 }) };
            } catch {
                return player;
            }
        })
    );
}

module.exports = {
    data: { name: "gs_pagination", type: "button" },
    async execute(interaction, client) {
        const customId = interaction.customId;
        const parts = customId.split(":");
        
        // Format attendu: gs_pagination:action:userId:...
        if (parts[0] !== "gs_pagination") {
            return;
        }

        const action = parts[1];
        const userId = parts[2];

        // Vérifier que l'utilisateur qui a fait la commande est bien celui qui clique
        if (interaction.user.id !== userId) {
            await interaction.reply({
                content: "❌ Seul l'auteur de la commande peut utiliser ces boutons.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const allPlayers = await players.getAllPlayers();
        const playersWithAvatars = await withAvatars(allPlayers, interaction.client);
        const totalPages = Math.ceil(playersWithAvatars.length / 10);

        let newPage = 1;
        let showAll = false;

        if (action === "prev") {
            const currentPage = parseInt(parts[3]);
            const perPage = parseInt(parts[4]);
            newPage = Math.max(1, currentPage - 1);
        } else if (action === "next") {
            const currentPage = parseInt(parts[3]);
            const perPage = parseInt(parts[4]);
            newPage = Math.min(totalPages, currentPage + 1);
        } else if (action === "showall") {
            showAll = true;
        }

        try {
            await interaction.update(await buildLeaderboard(playersWithAvatars, null, newPage, 10, showAll, userId));
        } catch (error) {
            if (error.code === 10062) {
                await interaction.reply({
                    content: "⚠️ L'interaction a expiré. Relance la commande `/gs tous` pour voir le classement complet.",
                    flags: MessageFlags.Ephemeral,
                }).catch(() => {});
            } else {
                console.error("Erreur lors de la mise à jour:", error);
                throw error;
            }
        }
    },
};
