const { welcomeChannelId, newMembeRoleId } = require("../../config/config.json");
const { buildWelcomeMessage } = require("../modules/welcome/resultMessage.js");
const logger = require("../functions/utils/Logger.js");

module.exports = {
    name: "guildMemberAdd",
    async execute(member) {
        if (newMembeRoleId) {
            try {
                await member.roles.add(newMembeRoleId);
            } catch (error) {
                logger.warn(`Impossible d'ajouter le rôle de nouveau membre à ${member.user.tag} : ${error.message}`);
            }
        }

        const channel = (welcomeChannelId && member.guild.channels.cache.get(welcomeChannelId))
            || member.guild.systemChannel;

        if (!channel?.isTextBased()) return;

        await channel.send(await buildWelcomeMessage(member));
    },
};
