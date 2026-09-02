const logger = require("../functions/utils/Logger");
const { ActivityType } = require("discord.js");
const { startAutomaticMessages } = require("../modules/messagesAuto/messagesAuto.js");
const { startGuildMembersCacheSync } = require("../modules/stuff/guildMembersCache.js");

module.exports = {
    name: "clientReady",
    once: true,
    async execute(client) {
        client.user.setPresence({
            activities: [{ name: "Besoin d'aide ? → /aide", type: ActivityType.Playing }],
            status: "online",
        });
        logger.clientStart(`${client.user.tag} est en ligne !`);
        await startAutomaticMessages(client);
        await startGuildMembersCacheSync(client);
    }
}
