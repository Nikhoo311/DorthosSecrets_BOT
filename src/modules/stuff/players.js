const { Timestamp } = require("firebase-admin/firestore");
const { db } = require("../../functions/utils/firebase.js");

const PLAYERS_COLLECTION = "players";

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

async function getPlayer(discordId) {
    const doc = await db.collection(PLAYERS_COLLECTION).doc(discordId).get();
    return doc.exists ? doc.data() : null;
}

async function upsertPlayer(discordId, { discordUsername, ingameName, ap, dp, details = "" }, updatedByDiscordId) {
    validateStats({ ingameName, ap, dp, details });

    const data = {
        discordId,
        discordUsername,
        ingameName: ingameName.trim(),
        ap,
        dp,
        gs: ap + dp,
        details,
        updatedAt: Timestamp.now(),
        updatedBy: updatedByDiscordId,
    };

    await db.collection(PLAYERS_COLLECTION).doc(discordId).set(data, { merge: true });
    return data;
}

async function getTop10() {
    const snapshot = await db.collection(PLAYERS_COLLECTION).orderBy("gs", "desc").limit(10).get();
    return snapshot.docs.map((doc) => doc.data());
}

function hasOfficierRole(member, officerRoleIds) {
    if (!Array.isArray(officerRoleIds) || officerRoleIds.length === 0) return false;
    return member.roles.cache.some((role) => officerRoleIds.includes(role.id));
}

module.exports = {
    getPlayer,
    upsertPlayer,
    getTop10,
    hasOfficierRole,
    ValidationError,
    AP_MIN,
    AP_MAX,
    DP_MIN,
    DP_MAX,
    DETAILS_MAX_LENGTH,
    INGAME_NAME_MAX_LENGTH,
};
