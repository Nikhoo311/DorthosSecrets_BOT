const { EmbedBuilder } = require("discord.js");
const { color } = require("../../config/config.json");

module.exports = {
    name: "guildMemberAdd",
    async execute(member) {
        const configuredChannel = process.env.WELCOME_CHANNEL_ID;
        const channel = (configuredChannel && member.guild.channels.cache.get(configuredChannel))
            || member.guild.systemChannel;

        if (!channel?.isTextBased()) return;

        const embed = new EmbedBuilder()
            .setColor(color.blue)
            .setAuthor({ name: member.guild.name, iconURL: member.guild.iconURL() ?? undefined })
            .setDescription(`Bienvenue ${member} sur **${member.guild.name}** !\nUtilise \`/recherche\` pour explorer les guides Dorthos Secrets.`)
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();

        await channel.send({ embeds: [embed] });
    },
};
