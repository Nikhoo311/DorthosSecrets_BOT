const { ModalBuilder, TextInputBuilder, TextInputStyle, LabelBuilder, StringSelectMenuBuilder } = require("discord.js");

function createSearchModal() {
    const modal = new ModalBuilder()
        .setCustomId("modal-recherche")
        .setTitle("Nouvelle recherche");

    const termeInput = new TextInputBuilder()
        .setCustomId("terme")
        .setPlaceholder("Ex: cristaux pve, zone de grind 1800 ap...")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const label = new LabelBuilder()
        .setLabel("Que cherches-tu ?")
        .setTextInputComponent(termeInput);

    const categorySelect = new StringSelectMenuBuilder()
        .setCustomId("recherche-categorie")
        .setPlaceholder("Toutes les catégories")
        .addOptions(
            { label: "Toutes les catégories", value: "tout", default: true, emoji: "🔎" },
            { label: "Stuff", value: "STUFF", emoji: "⚔️" },
            { label: "Argent", value: "ARGENT", emoji: "💰" },
            { label: "Optimisation", value: "OPTIMISATION", emoji: "⚙️" },
            { label: "Métier", value: "METIER", emoji: "🔨" },
        );

    const categoryLabel = new LabelBuilder()
        .setLabel("Catégorie")
        .setStringSelectMenuComponent(categorySelect);

    return modal.addLabelComponents(label, categoryLabel);
}

async function showSearchModal(interaction) {
    return interaction.showModal(createSearchModal());
}

module.exports = {
    data: {
        name: "btn-recherche-nouvelle",
        type: "button",
    },
    execute: showSearchModal,
    showSearchModal,
};
