const logger = require("../functions/utils/Logger");
const { ActivityType } = require("discord.js");

module.exports = {
    name: "clientReady",
    once: true,
    async execute(client) {
        client.user.setPresence({
            activities: [{ name: "Besoin d'aide ? → /aide", type: ActivityType.Playing }],
            status: "online",
        });
        logger.clientStart(`${client.user.tag} est en ligne !`)
    }
}
