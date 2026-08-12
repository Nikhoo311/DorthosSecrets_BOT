const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    LabelBuilder,
    StringSelectMenuBuilder,
} = require("discord.js");

module.exports = {
    data: {
        name: "btn-recherche-nouvelle",
        type: "button",
    },
    async execute(interaction) {
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
                { label: "Tous les contenus", value: "tout", default: true, emoji: "🔎" },
                { label: "Guides", value: "guide", emoji: "📖" },
                { label: "Outils", value: "outil", emoji: "🛠️" },
            );

        const categoryLabel = new LabelBuilder()
            .setLabel("Catégorie")
            .setStringSelectMenuComponent(categorySelect);

        modal.addLabelComponents(label, categoryLabel);
        return interaction.showModal(modal);
    },
};
