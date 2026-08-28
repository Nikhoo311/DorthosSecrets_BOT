const { MessageFlags } = require("discord.js");
const { assignCategoryRole } = require("../modules/roles/roles.js");

module.exports = {
    data: { name: "select-role-category", type: "selectMenu", multi: "select-role-category" },
    async execute(interaction) {
        const [, categoryIndexText] = interaction.customId.split(":");
        const selectedRoleId = interaction.values[0] ?? null;

        if (!selectedRoleId) {
            await interaction.deferUpdate();
            try {
                await assignCategoryRole(interaction.guild, interaction.user.id, Number(categoryIndexText), null);
            } catch (error) {
                console.error("Erreur lors du retrait d'un rôle de catégorie:", error);
                await interaction.followUp({
                    content: "❌ Impossible de retirer ce rôle. Vérifie que le rôle du bot est placé au-dessus des rôles de niveau.",
                    flags: MessageFlags.Ephemeral,
                });
            }
            return;
        }

        try {
            const { category, selectedLevel } = await assignCategoryRole(interaction.guild, interaction.user.id, Number(categoryIndexText), selectedRoleId);
            await interaction.reply({
                content: `✅ Rôle sélectionné pour **${category.name}** : <@&${selectedLevel.roleId}>.`,
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            if (error.message === "INVALID_CATEGORY_ROLE") return interaction.reply({ content: "❌ Ce rôle ne fait pas partie de cette catégorie.", flags: MessageFlags.Ephemeral });
            if (error.message === "MEMBER_NOT_FOUND") return interaction.reply({ content: "❌ Impossible de retrouver ce membre sur le serveur.", flags: MessageFlags.Ephemeral });
            if (error.message === "MAX_CATEGORY_ROLES_REACHED") return interaction.reply({ content: "❌ Tu peux sélectionner au maximum **5 rôles de catégorie**. Désélectionne d'abord un rôle avant d'en choisir un autre.", flags: MessageFlags.Ephemeral });
            console.error("Erreur lors de l'attribution d'un rôle de catégorie:", error);
            await interaction.reply({
                content: "❌ Impossible de modifier tes rôles. Vérifie que le rôle du bot est placé au-dessus des rôles de niveau.",
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
