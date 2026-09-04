const {
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
} = require("discord.js");
const config = require("../../../config/config.json");
const { drawLeaderboardImage } = require("./leaderboardImage.js");
const { drawPlayerCardImage } = require("./playerCardImage.js");

function toColorInt(hex) {
    return parseInt(hex.replace("#", ""), 16);
}

const ACCENT_PROFILE = toColorInt(config.color.blue);
const ACCENT_LEADERBOARD = toColorInt(config.color.orange);
const ACCENT_EMPTY = toColorInt(config.color.dark_grey);

function displayName(player) {
    return player.ingameName ?? player.discordUsername;
}

function toMessage(accentColor, content) {
    const container = new ContainerBuilder()
        .setAccentColor(accentColor)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
    return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

async function buildPlayerCard(player, targetUser, isSelf) {
    if (!player) {
        return toMessage(
            ACCENT_EMPTY,
            `**${targetUser.username}** n'a pas encore renseigné son stuff.\n-# Utilise \`/gs modifier\` pour l'ajouter.`
        );
    }

    const avatarURL = targetUser.displayAvatarURL({ extension: "png", size: 128 });
    const title = isSelf ? "Mon stuff" : `Stuff de ${displayName(player)}`;
    // `updatedAt` est déjà une Date (mappée dans players.js). Avant la
    // migration vers Supabase c'était un Timestamp Firestore, d'où l'ancien
    // `.toDate()`.
    const image = await drawPlayerCardImage(player, avatarURL, title, player.updatedAt);
    const fileName = `stuff-${targetUser.id}.png`;
    const files = [new AttachmentBuilder(image, { name: fileName })];

    const extraLines = [];
    if (player.details) extraLines.push(player.details);
    const link = player.details?.match(/https?:\/\/\S+/)?.[0];

    const container = new ContainerBuilder()
        .setAccentColor(ACCENT_PROFILE)
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder()
                    .setURL(`attachment://${fileName}`)
                    .setDescription(title)
            )
        );

    if (extraLines.length) {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(extraLines.join("\n\n")));
    }

    if (link) {
        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel("Ouvrir le lien").setStyle(ButtonStyle.Link).setURL(link),
            ),
        );
    }

    return { components: [container], files, flags: MessageFlags.IsComponentsV2 };
}

async function buildLeaderboard(top, topLabel, page = 1, perPage = 10, showAll = false, userId = null) {
    if (top.length === 0) {
        return toMessage(ACCENT_EMPTY, "Aucun stuff enregistré pour le moment.\n-# Sois le premier avec `/gs modifier` !");
    }

    const totalPages = Math.ceil(top.length / perPage);
    const actualPage = showAll ? 1 : Math.min(page, totalPages);

    const image = await drawLeaderboardImage(top, topLabel, actualPage, perPage, showAll);
    const files = [new AttachmentBuilder(image, { name: "classement-gs.png" })];

    const container = new ContainerBuilder()
        .setAccentColor(ACCENT_LEADERBOARD)
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder()
                    .setURL("attachment://classement-gs.png")
                    .setDescription("Stuff de la guilde")
            )
        );

    // Ajouter les boutons de pagination si ce n'est pas le mode "tous"
    if (!showAll && totalPages > 1 && userId) {
        const row = new ActionRowBuilder();

        const prevButton = new ButtonBuilder()
            .setCustomId(`gs_pagination:prev:${userId}:${actualPage}:${perPage}`)
            .setLabel("◀")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(actualPage <= 1);

        const pageButton = new ButtonBuilder()
            .setCustomId(`gs_pagination:page:${userId}:${actualPage}:${totalPages}`)
            .setLabel(`Page ${actualPage} sur ${totalPages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

        const nextButton = new ButtonBuilder()
            .setCustomId(`gs_pagination:next:${userId}:${actualPage}:${perPage}`)
            .setLabel("▶")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(actualPage >= totalPages);

        const showAllButton = new ButtonBuilder()
            .setCustomId(`gs_pagination:showall:${userId}`)
            .setLabel("Afficher entièrement")
            .setStyle(ButtonStyle.Primary);

        row.addComponents(prevButton, pageButton, nextButton, showAllButton);
        container.addActionRowComponents(row);
    }

    return { components: [container], files, flags: MessageFlags.IsComponentsV2 };
}

module.exports = { buildPlayerCard, buildLeaderboard };
