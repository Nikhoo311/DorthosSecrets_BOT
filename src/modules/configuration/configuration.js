const { db } = require("../../functions/utils/firebase.js");
const fileConfig = require("../../../config/config.json");

const COLLECTION = "configuration";

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

async function getGuildConfiguration(guildId) {
    const ref = db.collection(COLLECTION).doc(guildId);
    const snapshot = await ref.get();
    if (snapshot.exists) return normalize(snapshot.data(), guildId);

    const configuration = defaultConfiguration(guildId);
    await ref.set(configuration);
    return configuration;
}

async function updateGuildConfiguration(guildId, updates) {
    const current = await getGuildConfiguration(guildId);
    const configuration = normalize({ ...current, ...updates }, guildId);
    await db.collection(COLLECTION).doc(guildId).set(configuration);
    return configuration;
}

module.exports = { getGuildConfiguration, updateGuildConfiguration };
