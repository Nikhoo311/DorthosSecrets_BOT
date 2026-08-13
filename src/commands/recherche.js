const { SlashCommandBuilder } = require("discord.js");
const { showSearchModal } = require("../components/btn-recherche-nouvelle.js");

async function execute(interaction) {
    await showSearchModal(interaction);
}

module.exports = {
    name: "recherche",
    active: true,
    data: new SlashCommandBuilder()
        .setName("recherche")
        .setDescription("Recherche dans les guides Dorthos Secrets"),
    execute,
};
