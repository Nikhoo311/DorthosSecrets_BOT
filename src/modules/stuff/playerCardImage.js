const { createCanvas } = require("@napi-rs/canvas");
const {
    BG_COLOR,
    ROW_COLOR_EVEN,
    TEXT_PRIMARY,
    TEXT_SECONDARY,
    ACCENT_GOLD,
    ACCENT_GOLD_STRONG,
    TRACK_COLOR,
    SCALE,
    roundedRect,
    truncate,
    drawAvatarCircle,
} = require("./canvasTheme.js");

const WIDTH = 460;
const HEADER_HEIGHT = 50;
const ROW_HEIGHT = 78;
const FOOTER_HEIGHT = 26;
const PADDING_X = 20;
const CARD_RADIUS = 18;
const AVATAR_RADIUS = 26;

function displayName(player) {
    return player.ingameName ?? player.discordUsername;
}

async function drawPlayerCardImage(player, avatarURL, title, updatedAt) {
    const height = HEADER_HEIGHT + ROW_HEIGHT + FOOTER_HEIGHT;
    const canvas = createCanvas(WIDTH * SCALE, height * SCALE);
    const ctx = canvas.getContext("2d");
    ctx.scale(SCALE, SCALE);

    roundedRect(ctx, 0, 0, WIDTH, height, CARD_RADIUS);
    ctx.fillStyle = BG_COLOR;
    ctx.fill();

    ctx.textBaseline = "middle";
    ctx.font = "bold 20px 'DejaVu Sans'";
    ctx.fillStyle = ACCENT_GOLD_STRONG;
    ctx.fillText(title, PADDING_X, HEADER_HEIGHT / 2 + 2);

    const rowTop = HEADER_HEIGHT;
    const rowCenter = rowTop + ROW_HEIGHT / 2;

    roundedRect(ctx, PADDING_X / 2, rowTop, WIDTH - PADDING_X, ROW_HEIGHT, 14);
    ctx.fillStyle = ROW_COLOR_EVEN;
    ctx.fill();

    const avatarCenterX = WIDTH - PADDING_X - AVATAR_RADIUS;
    const nameX = PADDING_X + 14;
    const barWidth = 150;
    const statsX = avatarCenterX - AVATAR_RADIUS - 14;

    ctx.font = "bold 20px 'DejaVu Sans'";
    ctx.fillStyle = TEXT_PRIMARY;
    const name = truncate(ctx, displayName(player), barWidth + 50);
    ctx.fillText(name, nameX, rowTop + 26);

    const barY = rowTop + 50;
    roundedRect(ctx, nameX, barY, barWidth, 7, 3.5);
    ctx.fillStyle = TRACK_COLOR;
    ctx.fill();
    roundedRect(ctx, nameX, barY, barWidth, 7, 3.5);
    ctx.fillStyle = ACCENT_GOLD;
    ctx.fill();

    ctx.textAlign = "right";
    ctx.font = "bold 15px 'DejaVu Sans'";
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.fillText(`AP ${player.ap}  ·  DP ${player.dp}`, statsX, rowTop + 26);

    ctx.font = "bold 22px 'DejaVu Sans'";
    ctx.fillStyle = ACCENT_GOLD_STRONG;
    ctx.fillText(`${player.gs} GS`, statsX, rowTop + 54);
    ctx.textAlign = "left";

    await drawAvatarCircle(ctx, avatarURL, avatarCenterX, rowCenter, AVATAR_RADIUS);

    if (updatedAt) {
        ctx.font = "bold 12px 'DejaVu Sans'";
        ctx.fillStyle = TEXT_SECONDARY;
        ctx.fillText(`Mis à jour le ${updatedAt.toLocaleDateString("fr-FR")}`, PADDING_X, height - FOOTER_HEIGHT / 2);
    }

    return canvas.toBuffer("image/png");
}

module.exports = { drawPlayerCardImage };
