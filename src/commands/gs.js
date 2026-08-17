const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const config = require("../../config/config.json");
const players = require("../modules/stuff/players.js");
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
    );

async function execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "modifier") {
        const target = interaction.options.getUser("utilisateur") ?? interaction.user;
        const isSelf = target.id === interaction.user.id;

        if (!isSelf && !players.hasOfficierRole(interaction.member, config.officerRoleIds)) {
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
        // On récupère l'avatar Discord de chacun pour l'afficher dans l'image
        // du classement. Si un membre est injoignable (parti du serveur...),
        // on garde ses stats sans avatar plutôt que de faire échouer tout le
        // classement.
        const topWithAvatars = await Promise.all(
            top.map(async (player) => {
                try {
                    const user = await interaction.client.users.fetch(player.discordId);
                    return { ...player, avatarURL: user.displayAvatarURL({ extension: "png", size: 128 }) };
                } catch {
                    return player;
                }
            })
        );
        await interaction.editReply(await buildLeaderboard(topWithAvatars));
        return;
    }
}

module.exports = {
    name: "gs",
    active: true,
    data,
    execute,
};
