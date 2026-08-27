const { loadImage } = require("@napi-rs/canvas");

const BG_COLOR = "#0e0d12"; // --background
const ROW_COLOR_EVEN = "#17151d"; // --surface
const ROW_COLOR_ODD = "#1e1c26"; // --surface-hover
const TEXT_PRIMARY = "#e8e6ec"; // --foreground
const TEXT_SECONDARY = "#c9c6d1"; // --foreground atténué (plus lisible que --muted)
const ACCENT_GOLD = "#dba85c"; // --accent-warm
const ACCENT_GOLD_STRONG = "#eec98a"; // --accent-warm-strong
const TRACK_COLOR = "#2a2732"; // --border

const RANK_COLORS = { 1: ACCENT_GOLD_STRONG, 2: "#c7ccd1", 3: "#cd7f32" };
const DEFAULT_RANK_COLOR = "#8f8a99"; // --muted

const SCALE = 3;

function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function truncate(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let truncated = text;
    while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
        truncated = truncated.slice(0, -1);
    }
    return `${truncated}…`;
}

async function drawAvatarCircle(ctx, avatarURL, cx, cy, radius, backgroundColor = "rgba(0, 0, 0, 0.8)") {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = backgroundColor;
    ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 6;
    ctx.fill();
    ctx.restore();

    ctx.save();
    try {
        if (!avatarURL) throw new Error("no avatar url");
        const img = await loadImage(avatarURL);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        const diameter = radius * 2;
        const scale = Math.max(diameter / img.width, diameter / img.height);
        const width = img.width * scale;
        const height = img.height * scale;
        ctx.drawImage(img, cx - width / 2, cy - height / 2, width, height);
    } catch {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = TRACK_COLOR;
        ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = TEXT_PRIMARY;
    ctx.globalAlpha = 0.2;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
}

module.exports = {
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
};
