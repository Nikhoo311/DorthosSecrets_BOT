const { supabase } = require("../../functions/utils/supabase.js");
const fileConfig = require("../../../config/config.json");

const TABLE = "guild_configuration";

function defaultConfiguration(guildId) {
    return {
        guildId,
        officerRoleIds: Array.isArray(fileConfig.officerRoleIds) ? fileConfig.officerRoleIds : [],
        welcomeChannelId: fileConfig.welcomeChannelId || null,
        newMembeRoleId: fileConfig.newMembeRoleId || null,
    };
}

function normalize(configuration, guildId) {
    const defaults = defaultConfiguration(guildId);
    return {
        ...defaults,
        ...configuration,
        guildId,
        officerRoleIds: Array.isArray(configuration?.officerRoleIds)
            ? configuration.officerRoleIds.filter((id) => typeof id === "string")
            : defaults.officerRoleIds,
        welcomeChannelId: typeof configuration?.welcomeChannelId === "string" && configuration.welcomeChannelId
            ? configuration.welcomeChannelId
            : null,
        newMembeRoleId: typeof configuration?.newMembeRoleId === "string" && configuration.newMembeRoleId
            ? configuration.newMembeRoleId
            : null,
    };
}

// Postgres est en snake_case (et orthographié correctement : new_member_role_id).
// Le champ externe reste `newMembeRoleId` (typo historique) pour ne rien
// casser côté appelants — voir panel.js, select-parameters-category.js, etc.
function fromRow(row) {
    return {
        guildId: row.guild_id,
        officerRoleIds: row.officer_role_ids ?? [],
        welcomeChannelId: row.welcome_channel_id,
        newMembeRoleId: row.new_member_role_id,
    };
}

function toRow(configuration) {
    return {
        guild_id: configuration.guildId,
        officer_role_ids: configuration.officerRoleIds,
        welcome_channel_id: configuration.welcomeChannelId,
        new_member_role_id: configuration.newMembeRoleId,
        updated_at: new Date().toISOString(),
    };
}

function unwrap(operation, { data, error }) {
    if (error) {
        const wrapped = new Error(`[configuration] ${operation} a échoué : ${error.message}`);
        wrapped.cause = error;
        throw wrapped;
    }
    return data;
}

async function getGuildConfiguration(guildId) {
    const existing = unwrap(
        "getGuildConfiguration",
        await supabase.from(TABLE).select("*").eq("guild_id", guildId).maybeSingle()
    );
    if (existing) return normalize(fromRow(existing), guildId);

    // Aucune ligne : première utilisation sur ce serveur, on initialise avec
    // les valeurs par défaut (mêmes que Firestore : `set` inconditionnel).
    const configuration = defaultConfiguration(guildId);
    unwrap(
        "getGuildConfiguration (init)",
        await supabase.from(TABLE).upsert(toRow(configuration), { onConflict: "guild_id" })
    );
    return configuration;
}

async function updateGuildConfiguration(guildId, updates) {
    const current = await getGuildConfiguration(guildId);
    const configuration = normalize({ ...current, ...updates }, guildId);
    unwrap(
        "updateGuildConfiguration",
        await supabase.from(TABLE).upsert(toRow(configuration), { onConflict: "guild_id" })
    );
    return configuration;
}

module.exports = { getGuildConfiguration, updateGuildConfiguration };
