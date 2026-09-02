const { supabase } = require("../../functions/utils/supabase.js");

const PLAYERS_TABLE = "players";

const AP_MIN = 0;
const AP_MAX = 3000;
const DP_MIN = 0;
const DP_MAX = 1500;
const DETAILS_MAX_LENGTH = 500;
const INGAME_NAME_MAX_LENGTH = 32;

class ValidationError extends Error {}

function validateStats({ ingameName, ap, dp, details }) {
    if (!ingameName || !ingameName.trim()) {
        throw new ValidationError("Le pseudo en jeu est obligatoire.");
    }
    if (ingameName.trim().length > INGAME_NAME_MAX_LENGTH) {
        throw new ValidationError(`Le pseudo en jeu ne doit pas dépasser ${INGAME_NAME_MAX_LENGTH} caractères.`);
    }
    if (!Number.isFinite(ap) || ap < AP_MIN || ap > AP_MAX) {
        throw new ValidationError(`AP doit être un nombre entre ${AP_MIN} et ${AP_MAX}.`);
    }
    if (!Number.isFinite(dp) || dp < DP_MIN || dp > DP_MAX) {
        throw new ValidationError(`DP doit être un nombre entre ${DP_MIN} et ${DP_MAX}.`);
    }
    if (details && details.length > DETAILS_MAX_LENGTH) {
        throw new ValidationError(`Les détails ne doivent pas dépasser ${DETAILS_MAX_LENGTH} caractères.`);
    }
}

function fromRow(row) {
    if (!row) return null;
    return {
        discordId: row.discord_id,
        discordUsername: row.discord_username,
        ingameName: row.ingame_name,
        ap: row.ap,
        dp: row.dp,
        gs: row.gs,
        details: row.details ?? "",
        updatedAt: row.updated_at ? new Date(row.updated_at) : null,
        updatedBy: row.updated_by ?? null,
    };
}

function unwrap(operation, { data, error }) {
    if (error) {
        const wrapped = new Error(`[players] ${operation} a échoué : ${error.message}`);
        wrapped.cause = error;
        throw wrapped;
    }
    return data;
}

async function getPlayer(discordId) {
    const data = unwrap(
        "getPlayer",
        await supabase.from(PLAYERS_TABLE).select("*").eq("discord_id", discordId).maybeSingle()
    );
    return fromRow(data);
}

async function upsertPlayer(discordId, { discordUsername, ingameName, ap, dp, details = "" }, updatedByDiscordId) {
    validateStats({ ingameName, ap, dp, details });

    const row = {
        discord_id: discordId,
        discord_username: discordUsername,
        ingame_name: ingameName.trim(),
        ap,
        dp,
        details,
        updated_at: new Date().toISOString(),
        updated_by: updatedByDiscordId,
    };

    const data = unwrap(
        "upsertPlayer",
        await supabase.from(PLAYERS_TABLE).upsert(row, { onConflict: "discord_id" }).select("*").single()
    );

    return fromRow(data);
}

async function listByGs(operation, limit) {
    let query = supabase.from(PLAYERS_TABLE).select("*").order("gs", { ascending: false });
    if (limit) query = query.limit(limit);

    const data = unwrap(operation, await query);
    return (data ?? []).map(fromRow);
}

async function getTop10() {
    return listByGs("getTop10", 10);
}

async function getAllPlayers() {
    return listByGs("getAllPlayers", null);
}

function hasOfficierRole(member, officerRoleIds) {
    if (!Array.isArray(officerRoleIds) || officerRoleIds.length === 0) return false;
    return member.roles.cache.some((role) => officerRoleIds.includes(role.id));
}

module.exports = {
    getPlayer,
    upsertPlayer,
    getTop10,
    getAllPlayers,
    hasOfficierRole,
    ValidationError,
    AP_MIN,
    AP_MAX,
    DP_MIN,
    DP_MAX,
    DETAILS_MAX_LENGTH,
    INGAME_NAME_MAX_LENGTH,
};
