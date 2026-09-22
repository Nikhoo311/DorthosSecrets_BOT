function toColorInt(color) {
    const value = parseInt(color.replace("#", ""), 16);
    return Number.isNaN(value) ? null : value;
}

module.exports = { toColorInt };
