const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const players = require("../modules/stuff/players.js");
const { getGuildConfiguration } = require("../modules/configuration/configuration.js");
const { showGsModifierModal } = require("../components/modal-gs-modifier.js");
const { buildPlayerCard, buildLeaderboard } = require("../modules/stuff/resultMessage.js");

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
        await interaction.deferReply();
        const allPlayers = await players.getAllPlayers();
        await interaction.editReply(await buildLeaderboard(await withAvatars(allPlayers, interaction.client), null, 1, 10, false, interaction.user.id));
    }
}

module.exports = {
    name: "gs",
    active: true,
    data,
    execute,
};
