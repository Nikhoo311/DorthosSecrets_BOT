const { ModalBuilder, TextInputBuilder, TextInputStyle, LabelBuilder, MessageFlags } = require("discord.js");
const config = require("../../config/config.json");
const players = require("../modules/stuff/players.js");

function createModal(target, existing) {
    const modal = new ModalBuilder()
        .setCustomId(`modal-gs-modifier:${target.id}`)
        .setTitle(`Stuff de ${existing?.ingameName ?? target.username}`.slice(0, 45));

    const ingameNameInput = new TextInputBuilder()
        .setCustomId("ingameName")
        .setPlaceholder("Ex: Teazix")
        .setStyle(TextInputStyle.Short)
        .setMaxLength(players.INGAME_NAME_MAX_LENGTH)
        .setRequired(true);
    if (existing?.ingameName) ingameNameInput.setValue(existing.ingameName);
    const ingameNameLabel = new LabelBuilder().setLabel("Pseudo en jeu").setTextInputComponent(ingameNameInput);

    const apInput = new TextInputBuilder()
        .setCustomId("ap")
        .setPlaceholder("Ex: 430")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    if (existing) apInput.setValue(String(existing.ap));
    const apLabel = new LabelBuilder().setLabel("AP").setTextInputComponent(apInput);

    const dpInput = new TextInputBuilder()
        .setCustomId("dp")
        .setPlaceholder("Ex: 530")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    if (existing) dpInput.setValue(String(existing.dp));
    const dpLabel = new LabelBuilder().setLabel("DP").setTextInputComponent(dpInput);

    const detailsInput = new TextInputBuilder()
        .setCustomId("details")
        .setPlaceholder("Lien Garmoth, description rapide du stuff...")
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(players.DETAILS_MAX_LENGTH)
        .setRequired(false);
    if (existing?.details) detailsInput.setValue(existing.details);
    const detailsLabel = new LabelBuilder().setLabel("Détails").setTextInputComponent(detailsInput);

    return modal.addLabelComponents(ingameNameLabel, apLabel, dpLabel, detailsLabel);
}

async function showGsModifierModal(interaction, target) {
    let existing = null;
    try {
        existing = await players.getPlayer(target.id);
    } catch {
        existing = null;
    }
    return interaction.showModal(createModal(target, existing));
}

function parseNumberInput(raw) {
    return Number(raw.replace(",", ".").trim());
}

async function execute(interaction) {
    const [, targetId] = interaction.customId.split(":");
    const isSelf = targetId === interaction.user.id;

    if (!isSelf && !players.hasOfficierRole(interaction.member, config.officerRoleIds)) {
        await interaction.reply({
            content: "❌ Seuls les officiers peuvent modifier le stuff d'un autre membre.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const ingameName = interaction.fields.getTextInputValue("ingameName");
    const ap = parseNumberInput(interaction.fields.getTextInputValue("ap"));
    const dp = parseNumberInput(interaction.fields.getTextInputValue("dp"));
    const details = interaction.fields.getTextInputValue("details") ?? "";

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let targetUser;
    try {
        targetUser = await interaction.client.users.fetch(targetId);
    } catch {
        await interaction.editReply("❌ Impossible de retrouver ce membre.");
        return;
    }

    try {
        const player = await players.upsertPlayer(
            targetId,
            { discordUsername: targetUser.username, ingameName, ap, dp, details },
            interaction.user.id
        );
        const intro = isSelf ? "Ton stuff a été mis à jour :" : `Stuff de **${player.ingameName}** mis à jour :`;
        await interaction.editReply(`✅ ${intro} **${player.ap} AP** / **${player.dp} DP** (GS **${player.gs}**).`);
    } catch (error) {
        if (error instanceof players.ValidationError) {
            await interaction.editReply(`❌ ${error.message}`);
        } else {
            console.error("Erreur mise à jour stuff:", error);
            await interaction.editReply("❌ Une erreur est survenue, réessaie dans quelques secondes.");
        }
    }
}

module.exports = {
    data: {
        name: "modal-gs-modifier",
        type: "modal",
    },
    execute,
    showGsModifierModal,
};
