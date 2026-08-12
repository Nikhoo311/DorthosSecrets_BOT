const { readdirSync } = require("fs");
const path = require("path");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const logger = require("../utils/Logger");
const { clientID, serverID } = require("../../../config/config.json");

module.exports = (client) => {
    const { commandArray, commands } = client;

    client.handleCommands = async () => {
        const commandsPath = path.join(__dirname, "../..", "commands");
        const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith(".js"));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            if (!command.active) { continue; }
            commands.set(command.data.name, command);
            commandArray.push(command.data.toJSON());
            logger.command(`${command.data.name} est chargée avec succès !`);
        }

        const rest = new REST({ version: "9" }).setToken(process.env.TOKEN);

        try {
            logger.slashCommand("Refresh de l'application (/) commandes");

            if (process.env.DEV_MODE === "true") {
                logger.log("Mode développeur actif !")
                await rest.put(
                    Routes.applicationGuildCommands(clientID, serverID),
                    { body: commandArray },
                );
            }
            else {
                logger.warn("Mode production : les commandes peuvent se réinitialiser dans les 1h minimum.")
                await rest.put(
                    Routes.applicationCommands(clientID),
                    { body: commandArray },
                );
            }

            logger.slashCommand(`Chargement des (/) commandes terminé !`);
        } catch (error) {
            console.error(error);
        }
    };
};
