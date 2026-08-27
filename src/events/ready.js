const logger = require("../functions/utils/Logger");
const { ActivityType } = require("discord.js");
const { startAutomaticMessages } = require("../modules/messagesAuto/messagesAuto.js");

module.exports = {
    name: "clientReady",
    once: true,
    async execute(client) {
        client.user.setPresence({
            activities: [{ name: "Besoin d'aide ? → /aide", type: ActivityType.Playing }],
            status: "online",
        });
        logger.clientStart(`${client.user.tag} est en ligne !`);
        const guildNames = client.guilds.cache.map((guild) => guild.name);
        logger.log(`Serveurs connectés (${guildNames.length}) : ${guildNames.join(", ") || "aucun"}`);
        await startAutomaticMessages(client);
    }
}
