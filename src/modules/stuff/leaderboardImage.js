const { createCanvas } = require("@napi-rs/canvas");
const {
    BG_COLOR,
    ROW_COLOR_EVEN,
    ROW_COLOR_ODD,
    TEXT_PRIMARY,
    TEXT_SECONDARY,
    ACCENT_GOLD,
    ACCENT_GOLD_STRONG,
    TRACK_COLOR,
    RANK_COLORS,
    DEFAULT_RANK_COLOR,
    SCALE,
    roundedRect,
    truncate,
    drawAvatarCircle,
} = require("./canvasTheme.js");

const WIDTH = 460;
const HEADER_HEIGHT = 56;
const ROW_HEIGHT = 68;
const ROW_GAP = 6;
const PADDING_X = 20;
const CARD_RADIUS = 18;
const AVATAR_RADIUS = 22;

function displayName(player) {
    return player.ingameName ?? player.discordUsername;
}

async function drawLeaderboardImage(top) {
    const height = HEADER_HEIGHT + top.length * (ROW_HEIGHT + ROW_GAP) + PADDING_X / 2;
    const canvas = createCanvas(WIDTH * SCALE, height * SCALE);
    const ctx = canvas.getContext("2d");
    ctx.scale(SCALE, SCALE);

    roundedRect(ctx, 0, 0, WIDTH, height, CARD_RADIUS);
    ctx.fillStyle = BG_COLOR;
    ctx.fill();

    ctx.textBaseline = "middle";
    ctx.font = "bold 22px 'DejaVu Sans'";
    ctx.fillStyle = ACCENT_GOLD_STRONG;
    ctx.fillText("Stuff de la guilde", PADDING_X, HEADER_HEIGHT / 2 + 2);

    const maxGs = Math.max(...top.map((player) => player.gs), 1);
    const nameX = PADDING_X + 46;
    const barWidth = 150;
    const avatarCenterX = WIDTH - PADDING_X - AVATAR_RADIUS;
    const statsX = avatarCenterX - AVATAR_RADIUS - 14;

    for (let index = 0; index < top.length; index++) {
        const player = top[index];
        const rowTop = HEADER_HEIGHT + index * (ROW_HEIGHT + ROW_GAP);
        const rowCenter = rowTop + ROW_HEIGHT / 2;
        const rank = index + 1;

        roundedRect(ctx, PADDING_X / 2, rowTop, WIDTH - PADDING_X, ROW_HEIGHT, 12);
        ctx.fillStyle = index % 2 === 0 ? ROW_COLOR_EVEN : ROW_COLOR_ODD;
        ctx.fill();

        ctx.font = "bold 20px 'DejaVu Sans'";
        ctx.fillStyle = RANK_COLORS[rank] ?? DEFAULT_RANK_COLOR;
        ctx.fillText(`#${rank}`, PADDING_X + 10, rowCenter);

        ctx.font = "bold 17px 'DejaVu Sans'";
        ctx.fillStyle = TEXT_PRIMARY;
        const name = truncate(ctx, displayName(player), barWidth);
        ctx.fillText(name, nameX, rowTop + 22);

        const barY = rowTop + 42;
        roundedRect(ctx, nameX, barY, barWidth, 7, 3.5);
        ctx.fillStyle = TRACK_COLOR;
        ctx.fill();
        const filledWidth = Math.max(8, (player.gs / maxGs) * barWidth);
        roundedRect(ctx, nameX, barY, filledWidth, 7, 3.5);
        ctx.fillStyle = ACCENT_GOLD;
        ctx.fill();

        ctx.textAlign = "right";
        ctx.font = "bold 15px 'DejaVu Sans'";
        ctx.fillStyle = TEXT_SECONDARY;
        ctx.fillText(`AP ${player.ap}  ·  DP ${player.dp}`, statsX, rowTop + 22);

        ctx.font = "bold 21px 'DejaVu Sans'";
        ctx.fillStyle = ACCENT_GOLD_STRONG;
        ctx.fillText(`${player.gs} GS`, statsX, rowTop + 48);
        ctx.textAlign = "left";

        await drawAvatarCircle(ctx, player.avatarURL, avatarCenterX, rowCenter, AVATAR_RADIUS);
    }

    return canvas.toBuffer("image/png");
}

module.exports = { drawLeaderboardImage };
