const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("./recherche.js");

module.exports = {
    name: "aide",
    active: true,
    data: new SlashCommandBuilder()
        .setName("aide")
        .setDescription("Ouvre la recherche dans les guides Dorthos Secrets"),
    execute,
};
