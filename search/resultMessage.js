const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags, SectionBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } = require("discord.js");

const NEW_SEARCH_BUTTON = () => new ButtonBuilder()
    .setCustomId("btn-recherche-nouvelle")
    .setLabel("Nouvelle recherche")
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("🔄");

function getCategory(url) {
    return new URL(url).pathname.startsWith("/tools/")
        ? { emoji: "🛠️" }
        : { emoji: "📖" };
}

function formatTags(tags = []) {
    return tags.length > 0 ? tags.map((tag) => `[${tag}]`).join(" ") : null;
}

function buildResultMessage(best, query) {
    if (!best) {
        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`Aucun résultat pour **"${query}"**.`),
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(NEW_SEARCH_BUTTON()),
            );

        return { components: [container], flags: MessageFlags.IsComponentsV2 };
    }

    const category = getCategory(best.url);
    const titleSection = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## [${best.title}](${best.url})`),
        )
        .setButtonAccessory(
            new ButtonBuilder()
                .setCustomId("result-category-decoration")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(category.emoji)
                .setDisabled(true),
        );

    const container = new ContainerBuilder()
        .addSectionComponents(titleSection);

    if (best.image) {
        container.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(best.image),
            ),
        );
    }

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

    const formattedTags = formatTags(best.tags);
    if (formattedTags) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`\`\`\`ps\n${formattedTags}\`\`\``),
        );
    }

    container
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(best.excerpt || "_Aucun extrait disponible._"),
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel("Voir le guide")
                    .setStyle(ButtonStyle.Link)
                    .setURL(best.url)
                    .setEmoji("🔗"),
                NEW_SEARCH_BUTTON(),
            ),
        );

    return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

module.exports = { buildResultMessage };
