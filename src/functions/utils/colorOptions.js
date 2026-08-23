function buildColorOptions(colors, selectedColor) {
    return Object.entries(colors).map(([name, hex]) => ({
        label: name.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
        value: name,
        description: hex,
        ...(selectedColor === hex ? { default: true } : {}),
    }));
}

module.exports = { buildColorOptions };
