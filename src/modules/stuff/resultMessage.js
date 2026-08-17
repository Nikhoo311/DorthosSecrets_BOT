const {
    AttachmentBuilder,
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
    const image = await drawPlayerCardImage(player, avatarURL, title);
    const fileName = `stuff-${targetUser.id}.png`;
    const files = [new AttachmentBuilder(image, { name: fileName })];

    const updatedAt = player.updatedAt?.toDate?.();
    const extraLines = [];
    if (player.details) extraLines.push(player.details);
    if (updatedAt) extraLines.push(`-# Mis à jour le ${updatedAt.toLocaleDateString("fr-FR")}`);

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

    return { components: [container], files, flags: MessageFlags.IsComponentsV2 };
}

async function buildLeaderboard(top) {
    if (top.length === 0) {
        return toMessage(ACCENT_EMPTY, "Aucun stuff enregistré pour le moment.\n-# Sois le premier avec `/gs modifier` !");
    }

    const image = await drawLeaderboardImage(top);
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

    return { components: [container], files, flags: MessageFlags.IsComponentsV2 };
}

module.exports = { buildPlayerCard, buildLeaderboard };
