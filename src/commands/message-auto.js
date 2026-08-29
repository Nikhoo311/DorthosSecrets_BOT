const { ChannelType, SlashCommandBuilder, MessageFlags } = require("discord.js");
const { hasOfficierRole } = require("../modules/stuff/players.js");
const { getGuildConfiguration } = require("../modules/configuration/configuration.js");
const { showAutomaticMessageModal } = require("../components/modal-message-auto.js");
const { showAutomaticMessageSelect } = require("../components/select-message-auto.js");

module.exports = {
    name: "message-auto",
    active: true,
    data: new SlashCommandBuilder()
        .setName("message-auto")
        .setDescription("Programme un message automatique")
        .addSubcommand((sub) => sub
            .setName("creer")
            .setDescription("Crée un message automatique")
            .addChannelOption((option) => option
                .setName("salon")
                .setDescription("Salon de destination (salon actuel par défaut)")
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(false),
            ),
        )
        .addSubcommand((sub) => sub.setName("supprimer").setDescription("Supprime un message automatique"))
        .addSubcommand((sub) => sub.setName("modifier").setDescription("Modifie un message automatique")),
    async execute(interaction) {
        const configuration = await getGuildConfiguration(interaction.guildId);
        if (!hasOfficierRole(interaction.member, configuration.officerRoleIds)) {
            await interaction.reply({
                content: "❌ Seuls les officiers peuvent créer des messages automatiques.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === "supprimer" || subcommand === "modifier") {
            await showAutomaticMessageSelect(interaction, subcommand === "supprimer" ? "delete" : "update");
            return;
        }

        const channel = interaction.options.getChannel("salon") ?? interaction.channel;
        if (!channel?.isTextBased() || typeof channel.send !== "function") {
            await interaction.reply({
                content: "❌ Choisis un salon textuel dans lequel le bot peut envoyer des messages.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        await showAutomaticMessageModal(interaction, channel.id);
    },
};
