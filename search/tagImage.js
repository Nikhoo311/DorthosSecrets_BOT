const { createCanvas, loadImage } = require("canvas");

const TAG_STYLES = {
    STUFF: { icon: "⚔", color: "#c4b5fd", rgb: "139, 92, 246" },
    ARGENT: { icon: "💰", color: "#fcd34d", rgb: "245, 158, 11" },
    OPTIMISATION: { icon: "⚙", color: "#6ee7b7", rgb: "16, 185, 129" },
    METIER: { icon: "🔨", color: "#7dd3fc", rgb: "14, 165, 233" },
};

function roundedRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
}

function createTagsImage(tags = []) {
    const items = tags.filter((tag) => typeof tag === "string" && tag.trim()).map((tag) => {
        const label = tag.trim().toUpperCase();
        return { label, ...(TAG_STYLES[label] ?? { icon: "◆", color: "#93c5fd", rgb: "59, 130, 246" }) };
    });
    if (items.length === 0) return null;

    const measureCanvas = createCanvas(1, 1);
    const measure = measureCanvas.getContext("2d");
    const iconFont = "15px 'Segoe UI Emoji'";
    const labelFont = "600 11px Arial";
    const gap = 8;
    const paddingX = 10;
    const widths = items.map(({ icon, label }) => {
        measure.font = iconFont;
        const iconWidth = measure.measureText(icon).width;
        measure.font = labelFont;
        return Math.ceil(iconWidth + 5 + measure.measureText(label).width) + paddingX * 2;
    });
    const width = widths.reduce((total, itemWidth) => total + itemWidth, 0) + gap * (items.length - 1);
    const height = 28;
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    context.textBaseline = "middle";

    let x = 0;
    items.forEach(({ icon, label, color, rgb }, index) => {
        const itemWidth = widths[index];
        roundedRect(context, x, 2, itemWidth, 24, 12);
        context.fillStyle = `rgba(${rgb}, 0.15)`;
        context.fill();
        context.strokeStyle = `rgba(${rgb}, 0.30)`;
        context.lineWidth = 1;
        context.stroke();
        context.fillStyle = color;
        context.font = iconFont;
        context.fillText(icon, x + paddingX, height / 2 + 0.5);
        const iconWidth = context.measureText(icon).width;
        context.font = labelFont;
        context.fillText(label, x + paddingX + iconWidth + 5, height / 2 + 0.5);
        x += itemWidth + gap;
    });

    return canvas.toBuffer("image/png");
}

async function createReducedGalleryImage(imageUrl) {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Impossible de charger l'image (${response.status}).`);

    const image = await loadImage(Buffer.from(await response.arrayBuffer()));
    const canvas = createCanvas(480, 270);
    const context = canvas.getContext("2d");
    const targetRatio = canvas.width / canvas.height;
    const imageRatio = image.width / image.height;
    const sourceWidth = imageRatio > targetRatio ? image.height * targetRatio : image.width;
    const sourceHeight = imageRatio > targetRatio ? image.height : image.width / targetRatio;
    const sourceX = (image.width - sourceWidth) / 2;
    const sourceY = (image.height - sourceHeight) / 2;

    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
    return canvas.toBuffer("image/png");
}

module.exports = { createTagsImage, createReducedGalleryImage };
