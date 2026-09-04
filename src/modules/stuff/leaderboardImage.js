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
    STUFF_FONT,
    roundedRect,
    truncate,
    drawAvatarCircle,
} = require("./canvasTheme.js");

const WIDTH = 1600;
const TOP_ZOOM = 2.3;
const TEXT_ZOOM = 1.3;
const size = (value) => value * TOP_ZOOM;
const fontSize = (value) => size(value) * TEXT_ZOOM;
const HEADER_HEIGHT = size(56);
const ROW_HEIGHT = size(68);
const ROW_GAP = size(6);
const PADDING = size(20);
const COLUMN_GAP = size(16);
const ROWS_PER_COLUMN = 5;
const CARD_RADIUS = size(18);
const AVATAR_RADIUS = size(22);
const COLUMN_WIDTH = (WIDTH - PADDING * 2 - COLUMN_GAP) / 2;

function displayName(player) {
    return player.ingameName ?? player.discordUsername;
}

async function drawLeaderboardImage(players, topLabel, page = 1, perPage = 10, showAll = false) {
    const totalPlayers = players.length;
    
    // Déterminer les joueurs à afficher
    let displayedPlayers;
    if (showAll) {
        displayedPlayers = players;
    } else {
        const startIndex = (page - 1) * perPage;
        const endIndex = startIndex + perPage;
        displayedPlayers = players.slice(startIndex, endIndex);
    }

    // Hauteur : fixe pour pagination, variable pour "Afficher entièrement"
    const rowsForHeight = showAll ? Math.ceil(displayedPlayers.length / 2) : Math.ceil(perPage / 2);
    const height = HEADER_HEIGHT + rowsForHeight * (ROW_HEIGHT + ROW_GAP) + PADDING / 2;

    const canvas = createCanvas(WIDTH * SCALE, height * SCALE);
    const ctx = canvas.getContext("2d");
    ctx.scale(SCALE, SCALE);

    roundedRect(ctx, 0, 0, WIDTH, height, CARD_RADIUS);
    ctx.fillStyle = BG_COLOR;
    ctx.fill();

    ctx.textBaseline = "middle";
    ctx.font = `bold ${fontSize(22)}px '${STUFF_FONT}'`;
    ctx.fillStyle = ACCENT_GOLD_STRONG;
    const title = topLabel ? `Stuff de la guilde · Top ${topLabel}` : "Stuff de la guilde";
    ctx.fillText(title, PADDING, HEADER_HEIGHT / 2 + 2);

    const maxGs = Math.max(...players.map((player) => player.gs), 1);
    const barWidth = size(128);

    for (let index = 0; index < displayedPlayers.length; index++) {
        const player = displayedPlayers[index];
        const globalIndex = showAll ? index : (page - 1) * perPage + index;
        
        // Format 2 colonnes : 1/2, 3/4, 5/6...
        const column = index % 2;
        const row = Math.floor(index / 2);
        
        const rowX = PADDING + column * (COLUMN_WIDTH + COLUMN_GAP);
        const rowTop = HEADER_HEIGHT + row * (ROW_HEIGHT + ROW_GAP);
        const rowCenter = rowTop + ROW_HEIGHT / 2;
        const rank = globalIndex + 1;
        const avatarCenterX = rowX + COLUMN_WIDTH - PADDING - AVATAR_RADIUS;
        const statsX = avatarCenterX - AVATAR_RADIUS - size(14);
        const nameX = rowX + size(52);

        roundedRect(ctx, rowX, rowTop, COLUMN_WIDTH, ROW_HEIGHT, size(12));
        ctx.fillStyle = index % 2 === 0 ? ROW_COLOR_EVEN : ROW_COLOR_ODD;
        ctx.fill();

        ctx.font = `bold ${fontSize(20)}px '${STUFF_FONT}'`;
        ctx.fillStyle = RANK_COLORS[rank] ?? DEFAULT_RANK_COLOR;
        ctx.fillText(`#${rank}`, rowX + size(10), rowCenter);

        ctx.font = `bold ${fontSize(17)}px '${STUFF_FONT}'`;
        ctx.fillStyle = TEXT_PRIMARY;
        ctx.fillText(truncate(ctx, displayName(player), barWidth), nameX, rowTop + size(22));

        const barY = rowTop + size(42);
        roundedRect(ctx, nameX, barY, barWidth, size(7), size(3.5));
        ctx.fillStyle = TRACK_COLOR;
        ctx.fill();
        const filledWidth = Math.max(size(8), (player.gs / maxGs) * barWidth);
        roundedRect(ctx, nameX, barY, filledWidth, size(7), size(3.5));
        ctx.fillStyle = ACCENT_GOLD;
        ctx.fill();

        ctx.textAlign = "right";
        ctx.font = `bold ${fontSize(15)}px '${STUFF_FONT}'`;
        ctx.fillStyle = TEXT_SECONDARY;
        ctx.fillText(`AP ${player.ap} · DP ${player.dp}`, statsX, rowTop + size(22));
        ctx.font = `bold ${fontSize(21)}px '${STUFF_FONT}'`;
        ctx.fillStyle = ACCENT_GOLD_STRONG;
        ctx.fillText(`${player.gs} GS`, statsX, rowTop + size(48));
        ctx.textAlign = "left";

        await drawAvatarCircle(ctx, player.avatarURL, avatarCenterX, rowCenter, AVATAR_RADIUS);
    }

    return canvas.toBuffer("image/png");
}

module.exports = { drawLeaderboardImage };
