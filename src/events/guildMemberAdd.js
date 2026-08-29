const { buildWelcomeMessage } = require("../modules/welcome/resultMessage.js");
const logger = require("../functions/utils/Logger.js");
const { getGuildConfiguration } = require("../modules/configuration/configuration.js");

module.exports = {
    name: "guildMemberAdd",
    async execute(member) {
        const { welcomeChannelId, newMembeRoleId } = await getGuildConfiguration(member.guild.id);
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
