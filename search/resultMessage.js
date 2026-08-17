const { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags, SectionBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } = require("discord.js");
const { createReducedGalleryImage, createTagsImage } = require("./tagImage.js");

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

async function buildResultMessage(best, query) {
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

    const files = [];
    if (best.image) {
        try {
            const galleryImage = await createReducedGalleryImage(best.image);
            files.push(new AttachmentBuilder(galleryImage, { name: "dorthos-result.png" }));
            container.addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder().setURL("attachment://dorthos-result.png").setDescription(best.title),
                ),
            );
        } catch (error) {
            console.warn("Impossible de réduire l'image du résultat:", error.message);
        }
    }

    const tagsImage = createTagsImage(best.tags);
    if (tagsImage) {
        files.push(new AttachmentBuilder(tagsImage, { name: "dorthos-tags.png" }));
        container.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL("attachment://dorthos-tags.png"),
            ),
        );
    }

    container
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(best.description || "_Aucune description disponible._"),
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel(`Voir ${best.type === "tool" ? "l'outil" : "le guide"}`)
                    .setStyle(ButtonStyle.Link)
                    .setURL(best.url)
                    .setEmoji("🔗"),
                NEW_SEARCH_BUTTON(),
            ),
        );

    return {
        components: [container],
        files,
        flags: MessageFlags.IsComponentsV2,
    };
}

module.exports = { buildResultMessage };
