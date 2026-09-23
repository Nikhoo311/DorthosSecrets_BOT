const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const players = require("../modules/stuff/players.js");
const { getGuildConfiguration } = require("../modules/configuration/configuration.js");
const { showGsModifierModal } = require("../components/modal-gs-modifier.js");
const { buildPlayerCard, buildLeaderboard } = require("../modules/stuff/resultMessage.js");
const { needsRegeneration, generateAllPages, deleteCachedImages, sendCachedImages, saveDataHash, calculateDataHash } = require("../modules/stuff/leaderboardCache.js");
const logger = require("../functions/utils/Logger");

const data = new SlashCommandBuilder()
    .setName("gs")
    .setDescription("Gear Score : stuff, fiche et classement de la guilde")
    .addSubcommand((sub) =>
        sub
            .setName("modifier")
            .setDescription("Mets à jour ton AP/DP (ou celui d'un autre si tu es officier)")
            .addUserOption((opt) =>
                opt
                    .setName("utilisateur")
                    .setDescription("Le membre dont tu veux modifier le stuff (réservé aux officiers)")
            )
    )
    .addSubcommand((sub) =>
        sub
            .setName("voir")
            .setDescription("Affiche la fiche stuff d'un membre")
            .addUserOption((opt) =>
                opt.setName("utilisateur").setDescription("Le membre à consulter (toi-même par défaut)")
            )
    )
    .addSubcommand((sub) =>
        sub.setName("classement").setDescription("Top 10 des meilleurs Gear Score de la guilde")
    )
    .addSubcommand((sub) =>
        sub.setName("tous").setDescription("Affiche le Gear Score de tous les membres enregistrés")
    );

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

async function execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "modifier") {
        const target = interaction.options.getUser("utilisateur") ?? interaction.user;
        const isSelf = target.id === interaction.user.id;

        const configuration = await getGuildConfiguration(interaction.guildId);
        if (!isSelf && !players.hasOfficierRole(interaction.member, configuration.officerRoleIds)) {
            await interaction.reply({
                content: "❌ Seuls les officiers peuvent modifier le stuff d'un autre membre.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await showGsModifierModal(interaction, target);
        return;
    }

    if (sub === "voir") {
        await interaction.deferReply();
        const target = interaction.options.getUser("utilisateur") ?? interaction.user;
        const isSelf = target.id === interaction.user.id;
        const player = await players.getPlayer(target.id);
        await interaction.editReply(await buildPlayerCard(player, target, isSelf));
        return;
    }

    if (sub === "classement") {
        await interaction.deferReply();
        const top = await players.getTop10();
        const topWithAvatars = await withAvatars(top, interaction.client);
        await interaction.editReply(await buildLeaderboard(topWithAvatars, 10, 1, 10, false, interaction.user.id));
        return;
    }

    if (sub === "tous") {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const allPlayers = await players.getAllPlayers();
        const playersWithAvatars = await withAvatars(allPlayers, interaction.client);
        
        try {
            if (await needsRegeneration(playersWithAvatars)) {
                await interaction.editReply("⏳ Génération des images en cours... Cela peut prendre quelques secondes.");
                
                await deleteCachedImages();
                const totalPages = await generateAllPages(playersWithAvatars);
                const currentHash = calculateDataHash(playersWithAvatars);
                await saveDataHash(currentHash, totalPages);
                
                await interaction.editReply("✅ Images générées ! Envoi en cours...");
            } else {
                await interaction.editReply("📷 Envoi des images en cours...");
            }
            
            await sendCachedImages(interaction.channel, interaction.user.id, interaction.user.username);
        } catch (error) {
            logger.error(`Erreur avec le système de cache : ${error.message}`);
            await interaction.editReply("⚠️ Erreur avec le système de cache, utilisation du système classique...");
            await interaction.editReply(await buildLeaderboard(playersWithAvatars, null, 1, 10, false, interaction.user.id));
        }
    }
}

module.exports = {
    name: "gs",
    active: true,
    data,
    execute,
};
