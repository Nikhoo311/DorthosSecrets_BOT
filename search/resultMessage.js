const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { color } = require("../config/config.json");

const SITE_URL = process.env.SITE_URL?.replace(/\/$/, "");
const SITE_ICON = `${SITE_URL}/images/favicon_dorthos_secrets.png`;

const NEW_SEARCH_BUTTON = () => new ButtonBuilder()
    .setCustomId("btn-recherche-nouvelle")
    .setLabel("Nouvelle recherche")
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("🔄");

function getCategory(url) {
    const isTool = new URL(url).pathname.startsWith("/tools/");
    return isTool
        ? { label: "🛠️ Outil", color: color.blue, action: "Ouvrir l'outil" }
        : { label: "📖 Guide", color: color.orange, action: "Voir le guide" };
}

function createActionRow(...components) {
    return new ActionRowBuilder().addComponents(...components);
}

function formatTags(tags = []) {
    return tags.length > 0 ? tags.map((tag) => `\`${tag}\``).join(" ") : "Aucun tag";
}

function buildResultMessage(best, query) {
    if (!best) {
        const embed = new EmbedBuilder()
            .setDescription(`Aucun résultat pour **"${query}"**.`)
            .setColor(color.dark_grey);

        return { embeds: [embed], components: [createActionRow(NEW_SEARCH_BUTTON())] };
    }

    const category = getCategory(best.url);

    const embed = new EmbedBuilder()
        .setTitle(best.title)
        .setURL(best.url)
        .setDescription(best.excerpt)
        .setColor(category.color)
        .addFields(
            { name: "Type", value: category.label, inline: true },
            { name: "Tags", value: formatTags(best.tags), inline: true },
        )
        .setFooter({ text: `Recherche : "${query}"` })
        .setTimestamp();

    if (best.image) embed.setThumbnail(best.image);

    const row = createActionRow(
        new ButtonBuilder()
            .setLabel(category.action)
            .setStyle(ButtonStyle.Link)
            .setURL(best.url)
            .setEmoji("🔗"),
        NEW_SEARCH_BUTTON()
    );

    return { embeds: [embed], components: [row] };
}

module.exports = { buildResultMessage };
