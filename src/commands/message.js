const { ChannelType, SlashCommandBuilder, MessageFlags } = require("discord.js");
const config = require("../../config/config.json");
const { hasOfficierRole } = require("../modules/stuff/players.js");
const { showMessageModal } = require("../components/modal-message.js");

module.exports = {
    name: "message",
    active: true,
    data: new SlashCommandBuilder()
        .setName("message")
        .setDescription("Envoie un message avec le bot")
        .addChannelOption((option) => option
            .setName("salon")
            .setDescription("Salon de destination (salon actuel par défaut)")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(false),
        ),
    async execute(interaction) {
        if (!hasOfficierRole(interaction.member, config.officerRoleIds)) {
            await interaction.reply({ content: "❌ Seuls les officiers peuvent envoyer un message avec le bot.", flags: MessageFlags.Ephemeral });
            return;
        }
        const channel = interaction.options.getChannel("salon") ?? interaction.channel;
        if (!channel?.isTextBased() || typeof channel.send !== "function") {
            await interaction.reply({ content: "❌ Choisis un salon textuel dans lequel le bot peut envoyer des messages.", flags: MessageFlags.Ephemeral });
            return;
        }
        await showMessageModal(interaction, channel.id);
    },
};
