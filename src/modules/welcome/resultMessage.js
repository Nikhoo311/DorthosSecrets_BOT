const {
    AttachmentBuilder,
    ContainerBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
} = require("discord.js");
const { drawWelcomeImage } = require("./welcomeImage.js");

function datePrefix(date = new Date()) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
}

async function buildWelcomeMessage(member) {
    const image = await drawWelcomeImage(member);
    const fileName = `${datePrefix()}_${member.user.id}.png`;

    const container = new ContainerBuilder()
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder()
                    .setURL(`attachment://${fileName}`)
                    .setDescription(`Bienvenue ${member.displayName} sur ${member.guild.name} !`),
            ),
        );

    return {
        components: [container],
        files: [new AttachmentBuilder(image, { name: fileName })],
        flags: MessageFlags.IsComponentsV2,
    };
}

module.exports = { buildWelcomeMessage };
