const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    ModalBuilder,
    StringSelectMenuBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require("discord.js");
const { LabelBuilder } = require("@discordjs/builders");
const ms = require("ms");
const config = require("../../config/config.json");
const { getGuildConfiguration } = require("../modules/configuration/configuration.js");
const { hasOfficierRole } = require("../modules/stuff/players.js");
const { buildColorOptions } = require("../functions/utils/colorOptions.js");

const MIN_DURATION_MS = 60000;

function parseDuration(input) {
    const parts = [...input.matchAll(/(\d+(?:[.,]\d+)?)\s*(seconds?|secs?|s|minutes?|mins?|min|m|hours?|hrs?|hr|h|days?|d|weeks?|w|years?|yrs?|yr|y)/gi)];
    const normalizedInput = input.replace(/\s/g, "");
    const normalizedParts = parts.map((part) => part[0]).join("").replace(/\s/g, "");

    if (!parts.length || normalizedParts !== normalizedInput) return null;

    return parts.reduce(
        (total, part) => total + ms(`${part[1].replace(",", ".")}${part[2]}`),
        0,
    );
}

function parseStartAt(input) {
    if (!input) return null;

    const match = input.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2})h(\d{2})$/);
    if (!match) return null;

    const [, dayText, monthText, yearText, hourText, minuteText] = match;
    const day = Number(dayText);
    const month = Number(monthText);
    const year = Number(yearText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const value = new Date(year, month - 1, day, hour, minute);

    const valid = value.getFullYear() === year
        && value.getMonth() === month - 1
        && value.getDate() === day
        && value.getHours() === hour
        && value.getMinutes() === minute;
    return valid ? value.getTime() : null;
}

function buildModal(channelId) {
    const duration = new TextInputBuilder()
        .setCustomId("duration")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Ex: 2h30min, 1w")
        .setRequired(true);
    const startAt = new TextInputBuilder()
        .setCustomId("startAt")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Ex: 24/08/2026 20h00")
        .setRequired(false);
    const color = new StringSelectMenuBuilder()
        .setCustomId("accentColor")
        .setPlaceholder("Choisis une couleur")
        .setMinValues(0)
        .setMaxValues(1)
        .setRequired(false)
        .addOptions(buildColorOptions(config.color));

    return new ModalBuilder()
        .setCustomId(`modal-message-auto:${channelId}`)
        .setTitle("Planifier un message automatique")
        .addLabelComponents(
            new LabelBuilder()
                .setLabel("Fréquence")
                .setDescription("Minimum 1 min. Ex: 2h30min, 1w.")
                .setTextInputComponent(duration),
            new LabelBuilder()
                .setLabel("Date de début")
                .setDescription("Vide : démarrage après la première fréquence.")
                .setTextInputComponent(startAt),
            new LabelBuilder().setLabel("Couleur").setStringSelectMenuComponent(color),
        );
}

module.exports = {
    data: { name: "modal-message-auto", type: "modal", multi: "modal-message-auto" },
    parseDuration,
    MIN_DURATION_MS,
    showAutomaticMessageModal: (interaction, channelId) => interaction.showModal(buildModal(channelId)),
    async execute(interaction) {
        const configuration = await getGuildConfiguration(interaction.guildId);
        if (!hasOfficierRole(interaction.member, configuration.officerRoleIds)) {
            return interaction.reply({ content: "❌ Accès refusé.", flags: MessageFlags.Ephemeral });
        }

        const [, channelId] = interaction.customId.split(":");
        const durationInput = interaction.fields.getTextInputValue("duration").trim();
        const startInput = interaction.fields.getTextInputValue("startAt").trim();
        const durationMs = parseDuration(durationInput);
        const startAt = parseStartAt(startInput);
        const [colorName] = interaction.fields.getStringSelectValues("accentColor");

        if (!channelId || !Number.isFinite(durationMs) || durationMs < MIN_DURATION_MS || (startInput && (!startAt || startAt <= Date.now()))) {
            return interaction.reply({
                content: "❌ Date invalide ou passée. Format : `24/08/2026 20h00`.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const key = `${interaction.user.id}:${channelId}`;
        interaction.client.pendingAutomaticMessageCreations.set(key, {
            channelId,
            durationMs,
            durationInput,
            startAt,
            accentColor: config.color[colorName] ?? null,
        });
        setTimeout(() => interaction.client.pendingAutomaticMessageCreations.delete(key), 900000).unref();

        await interaction.reply({
            content: "Planification enregistrée. Passe à la saisie du contenu.",
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`button-message-auto:create-content:${channelId}`)
                        .setLabel("Continuer")
                        .setStyle(ButtonStyle.Primary),
                ),
            ],
            flags: MessageFlags.Ephemeral,
        });
    },
};
