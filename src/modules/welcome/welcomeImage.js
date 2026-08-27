const path = require("path");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const {
    TEXT_PRIMARY,
    ACCENT_GOLD_STRONG,
    SCALE,
    drawAvatarCircle,
    truncate,
} = require("../stuff/canvasTheme.js");

const WIDTH = 900;
const HEIGHT = 500;
const AVATAR_RADIUS = 90;
const ADAMANTIS_LOGO_PATH = path.resolve(__dirname, "../../../config/images/logo_adamantis.png");
const BANNER_PATH = path.resolve(__dirname, "../../../config/images/welcome_banner.jpg");

function drawCover(ctx, image, width, height) {
    const scale = Math.max(width / image.width, height / image.height);
    const drawnWidth = image.width * scale;
    const drawnHeight = image.height * scale;
    ctx.drawImage(image, (width - drawnWidth) / 2, (height - drawnHeight) / 2, drawnWidth, drawnHeight);
}

function drawCenteredText(ctx, text, centerX, y) {
    ctx.fillText(text, centerX - ctx.measureText(text).width / 2, y);
}

function drawCenteredEmojiText(ctx, text, centerX, y, fontSize) {
    const parts = [...new Intl.Segmenter("fr", { granularity: "grapheme" }).segment(text)]
        .map(({ segment }) => ({
            text: segment,
            isEmoji: /\p{Extended_Pictographic}/u.test(segment),
        }));

    const fontFor = (isEmoji) => isEmoji
        ? `${fontSize}px 'Noto Color Emoji', 'Noto Emoji'`
        : `bold ${fontSize}px 'DejaVu Sans'`;

    const widths = parts.map((part) => {
        ctx.font = fontFor(part.isEmoji);
        return ctx.measureText(part.text).width;
    });
    let x = centerX - widths.reduce((total, width) => total + width, 0) / 2;

    for (let index = 0; index < parts.length; index++) {
        ctx.font = fontFor(parts[index].isEmoji);
        ctx.fillText(parts[index].text, x, y);
        x += widths[index];
    }
}

async function drawWelcomeImage(member) {
    const canvas = createCanvas(WIDTH * SCALE, HEIGHT * SCALE);
    const ctx = canvas.getContext("2d");
    ctx.scale(SCALE, SCALE);

    const banner = await loadImage(BANNER_PATH);
    ctx.save();
    ctx.filter = "blur(7px)";
    ctx.translate(-10, -10);
    drawCover(ctx, banner, WIDTH + 20, HEIGHT + 20);
    ctx.restore();

    const centerX = WIDTH / 2;
    const circlesY = 174;
    const circleOffset = 140;
    await drawAvatarCircle(
        ctx,
        member.user.displayAvatarURL({ extension: "png", size: 256 }),
        centerX - circleOffset,
        circlesY,
        AVATAR_RADIUS,
    );
    await drawAvatarCircle(
        ctx,
        ADAMANTIS_LOGO_PATH,
        centerX + circleOffset,
        circlesY,
        AVATAR_RADIUS,
        "#1A1A1E",
    );

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.65;
    for (const offset of [-22, 0, 22]) {
        ctx.beginPath();
        ctx.arc(centerX + offset, circlesY, 7, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.font = "bold 38px 'DejaVu Sans'";
    ctx.fillStyle = TEXT_PRIMARY;
    const username = truncate(ctx, member.displayName, 560);
    const guildName = truncate(ctx, member.guild.name, 560);
    drawCenteredText(ctx, "Bienvenue", centerX, 323);

    ctx.font = "bold 44px 'DejaVu Sans'";
    ctx.fillStyle = ACCENT_GOLD_STRONG;
    drawCenteredText(ctx, username, centerX, 368);

    ctx.fillStyle = TEXT_PRIMARY;
    drawCenteredEmojiText(ctx, `sur ${guildName} !`, centerX, 413, 28);

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    return canvas.toBuffer("image/png");
}

module.exports = { drawWelcomeImage };
