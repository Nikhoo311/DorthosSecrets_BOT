const { supabase } = require("../../functions/utils/supabase.js");
const { serverID } = require("../../../config/config.json");

const TABLE = "guild_members_cache";
const SYNC_INTERVAL_MS = 10 * 60 * 1000;

function primaryRoleName(member) {
    const highest = member.roles.highest;
    return highest && highest.name !== "@everyone" ? highest.name : null;
}

function toRow(member) {
    return {
        discord_id: member.id,
        guild_id: member.guild.id,
        username: member.user.username,
        guild_nickname: member.nickname,
        avatar_url: member.displayAvatarURL({ extension: "png", size: 256 }),
        primary_role_name: primaryRoleName(member),
        updated_at: new Date().toISOString(),
    };
}

async function syncGuildMembersCache(client) {
    const guild = client.guilds.cache.get(serverID) ?? (await client.guilds.fetch(serverID));
    const members = await guild.members.fetch();
    const rows = [...members.values()]
        .filter((member) => !member.user.bot)
        .map(toRow);

    if (!rows.length) return 0;

    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: "discord_id" });
    if (error) {
        console.error("[guildMembersCache] synchronisation échouée :", error.message);
        return 0;
    }
    return rows.length;
}

async function startGuildMembersCacheSync(client) {
    try {
        const count = await syncGuildMembersCache(client);
        console.log(`[guildMembersCache] ${count} membre(s) synchronisé(s).`);
    } catch (error) {
        console.error("[guildMembersCache] échec de la synchronisation initiale :", error.message);
    }

    setInterval(async () => {
        try {
            await syncGuildMembersCache(client);
        } catch (error) {
            console.error("[guildMembersCache] échec de la synchronisation périodique :", error.message);
        }
    }, SYNC_INTERVAL_MS).unref();
}

module.exports = { syncGuildMembersCache, startGuildMembersCacheSync };
