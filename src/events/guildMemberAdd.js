const { welcomeChannelId } = require("../../config/config.json");
const { buildWelcomeMessage } = require("../modules/welcome/resultMessage.js");

module.exports = {
    name: "guildMemberAdd",
    async execute(member) {
        const channel = (welcomeChannelId && member.guild.channels.cache.get(welcomeChannelId))
            || member.guild.systemChannel;

        if (!channel?.isTextBased()) return;

        await channel.send(await buildWelcomeMessage(member));
    },
};
