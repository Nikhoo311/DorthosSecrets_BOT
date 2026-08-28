const {
    ActionRowBuilder,
    ContainerBuilder,
    MessageFlags,
    SeparatorBuilder,
    SeparatorSpacingSize,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    TextDisplayBuilder,
} = require("discord.js");
const { readFileSync, writeFileSync } = require("fs");
const path = require("path");
const config = require("../../../config/config.json");

const CONFIG_PATH = path.resolve(__dirname, "../../../config/config.json");
const MAX_CATEGORY_ROLES = 5;
const LEVEL_LABELS = {
    debutant: "Débutant / occasionnel",
    confirme: "Confirmé",
    expert: "Expert",
};

function getCategories() {
    return config.roleLevels?.categories ?? [];
}

function saveRoleIds(categories) {
    const saved = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
    saved.roleLevels.categories = categories;
    writeFileSync(CONFIG_PATH, `${JSON.stringify(saved, null, 4)}\n`, "utf8");
}

function splitRoleEmoji(name) {
    const match = name.match(/^(\p{Extended_Pictographic}(?:\uFE0F)?)(?:\s+)?/u);
    return { emoji: match?.[1] ?? null, label: name.slice(match?.[0].length ?? 0).trim() || name };
}

function buildCategoryPanel(category, index) {
    const entries = Object.entries(category.levels);
    const levels = entries.map(([, level]) => level);
    const menu = new StringSelectMenuBuilder()
        .setCustomId(`select-role-category:${index}`)
        .setPlaceholder("Choisis ton niveau")
        .setMinValues(0)
        .setMaxValues(1)
        .addOptions(entries.map(([key, level]) => {
            const { emoji, label } = splitRoleEmoji(level.name);
            const option = new StringSelectMenuOptionBuilder()
                .setLabel(label)
                .setValue(level.roleId)
                .setDescription(`Sélectionner le niveau ${LEVEL_LABELS[key] ?? key}`);
            if (emoji) option.setEmoji(emoji);
            return option;
        }));
    return new ContainerBuilder()
        .setAccentColor(Number.parseInt(category.levels.expert.color.replace("#", ""), 16))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `## ${category.emoji} ${category.name}\nChoisis le rôle qui correspond le mieux à ton niveau dans cette catégorie.\nTu ne peux conserver qu'un seul de ces rôles :\n${levels.map((level) => `- <@&${level.roleId}>`).join("\n")}`,
        ))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
        .addActionRowComponents(new ActionRowBuilder().addComponents(menu));
}

async function createRoles(guild, userTag) {
    const categories = getCategories();
    const existing = new Map(guild.roles.cache.map((role) => [role.name, role]));
    let created = 0;
    for (const category of categories) {
        for (const level of Object.values(category.levels)) {
            let role = existing.get(level.name);
            if (!role) {
                role = await guild.roles.create({
                    name: level.name,
                    color: level.color,
                    reason: `Création des rôles de niveau par ${userTag}`,
                });
                existing.set(role.name, role);
                created += 1;
            }
            level.roleId = role.id;
        }
    }
    saveRoleIds(categories);
    return created;
}

async function cleanConfiguredRoles(guild, userTag) {
    const categories = getCategories();
    let deleted = 0;
    let skipped = 0;

    for (const category of categories) {
        for (const level of Object.values(category.levels)) {
            if (!level.roleId) continue;
            const role = await guild.roles.fetch(level.roleId).catch(() => null);
            if (!role || !role.editable) {
                level.roleId = null;
                skipped += 1;
                continue;
            }

            await role.delete(`Nettoyage des rôles configurés par ${userTag}`);
            level.roleId = null;
            deleted += 1;
        }
    }

    saveRoleIds(categories);
    return { deleted, skipped };
}

async function publishRolePanels(channel) {
    const categories = getCategories();
    const incomplete = categories.find((category) => Object.values(category.levels).some((level) => !level.roleId));
    if (incomplete) throw new Error(`CATEGORY_INCOMPLETE:${incomplete.name}`);
    for (const [index, category] of categories.entries()) {
        await channel.send({ components: [buildCategoryPanel(category, index)], flags: MessageFlags.IsComponentsV2 });
    }
    return categories.length;
}

async function assignCategoryRole(guild, userId, index, selectedRoleId) {
    const category = getCategories()[index];
    const levels = category ? Object.values(category.levels) : [];
    const ids = levels.map((level) => level.roleId).filter(Boolean);
    if (!category || (selectedRoleId && !ids.includes(selectedRoleId))) {
        throw new Error("INVALID_CATEGORY_ROLE");
    }
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) throw new Error("MEMBER_NOT_FOUND");

    if (selectedRoleId) {
        const allCategoryRoleIds = new Set(
            getCategories().flatMap((item) => Object.values(item.levels).map((level) => level.roleId)),
        );
        const rolesOutsideCategory = [...member.roles.cache.keys()].filter((roleId) =>
            allCategoryRoleIds.has(roleId) && !ids.includes(roleId),
        );
        if (rolesOutsideCategory.length + 1 > MAX_CATEGORY_ROLES) {
            throw new Error("MAX_CATEGORY_ROLES_REACHED");
        }
    }

    const toRemove = ids.filter((id) => id !== selectedRoleId && member.roles.cache.has(id));
    if (toRemove.length) await member.roles.remove(toRemove);
    if (selectedRoleId && !member.roles.cache.has(selectedRoleId)) {
        await member.roles.add(selectedRoleId);
    }
    return {
        category,
        selectedLevel: levels.find((level) => level.roleId === selectedRoleId) ?? null,
    };
}

module.exports = {
    assignCategoryRole,
    cleanConfiguredRoles,
    createRoles,
    getCategories,
    MAX_CATEGORY_ROLES,
    publishRolePanels,
};
