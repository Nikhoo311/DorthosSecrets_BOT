const {
    ChannelType,
    MessageFlags,
    SlashCommandBuilder,
} = require("discord.js");
const roles = require("../modules/roles/roles.js");

const data = new SlashCommandBuilder()
    .setName("roles")
    .setDescription("Configure les rôles de niveau")
    .addSubcommand((subcommand) => subcommand
        .setName("créer")
        .setDescription("Crée les rôles de toutes les catégories"),
    )
    .addSubcommand((subcommand) => subcommand
        .setName("nettoyer")
        .setDescription("Supprime tous les rôles sous Dorthos Secrets")
        .addBooleanOption((option) => option
            .setName("confirmer")
            .setDescription("Confirme la suppression définitive")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) => subcommand
        .setName("panel")
        .setDescription("Publie les panneaux de sélection des rôles")
        .addChannelOption((option) => option
            .setName("salon")
            .setDescription("Salon dans lequel publier les panneaux")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true),
        ),
    );

function replyError(interaction, content) {
    return interaction.reply({ content, flags: MessageFlags.Ephemeral });
}

async function execute(interaction) {
    if (!interaction.guild) {
        return replyError(interaction, "❌ Cette commande doit être utilisée sur le serveur.");
    }
    if (interaction.user.id !== interaction.guild.ownerId) {
        return replyError(interaction, "❌ Seul le propriétaire du serveur peut utiliser cette commande.");
    }
    if (!interaction.guild.members.me?.permissions.has("ManageRoles")) {
        return replyError(interaction, "❌ Le bot a besoin de la permission **Gérer les rôles**.");
    }
    if (!roles.getCategories().length) {
        return replyError(interaction, "❌ La configuration `roleLevels.categories` est absente ou vide dans `config/config.json`.");
    }

    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "créer") return create(interaction);
    if (subcommand === "nettoyer") return clean(interaction);
    return publishPanel(interaction);
}

async function create(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
        const created = await roles.createRoles(interaction.guild, interaction.user.tag);
        await interaction.editReply(`✅ Création terminée : **${created}** rôle(s) créé(s), IDs enregistrés dans la configuration.`);
    } catch (error) {
        console.error("Erreur durant la création des rôles:", error);
        await interaction.editReply("❌ La création a échoué. Vérifie la hiérarchie et les permissions du bot.");
    }
}

async function clean(interaction) {
    if (!interaction.options.getBoolean("confirmer")) {
        return replyError(interaction, "❌ Nettoyage annulé. Relance avec `confirmer:true`.");
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
        const { deleted, skipped } = await roles.cleanConfiguredRoles(interaction.guild, interaction.user.tag);
        const skippedText = skipped ? ` **${skipped}** rôle(s) non supprimable(s) ont été ignoré(s).` : "";
        await interaction.editReply(`✅ Nettoyage terminé : **${deleted}** rôle(s) supprimé(s).${skippedText}`);
    } catch (error) {
        console.error("Erreur durant le nettoyage des rôles:", error);
        await interaction.editReply("❌ Le nettoyage a échoué. Vérifie la hiérarchie du bot.");
    }
}

async function publishPanel(interaction) {
    const channel = interaction.options.getChannel("salon");
    if (!channel?.isTextBased() || typeof channel.send !== "function") {
        return replyError(interaction, "❌ Choisis un salon textuel dans lequel le bot peut envoyer des messages.");
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
        const sent = await roles.publishRolePanels(channel);
        await interaction.editReply(`✅ **${sent}** panneau(x) de rôles publié(s) dans ${channel}.`);
    } catch (error) {
        if (error.message.startsWith("CATEGORY_INCOMPLETE:")) {
            const categoryName = error.message.slice("CATEGORY_INCOMPLETE:".length);
            return interaction.editReply(`❌ Les rôles de la catégorie **${categoryName}** ne sont pas configurés. Utilise d'abord \`/roles créer\`.`);
        }
        console.error("Erreur lors de la publication des panneaux de rôles:", error);
        await interaction.editReply("❌ Publication des panneaux impossible. Vérifie les permissions du bot dans ce salon.");
    }
}

module.exports = {
    name: "roles",
    active: true,
    data,
    execute,
};
