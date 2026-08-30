const { MessageFlags } = require("discord.js");
const { assignCategoryRole, removeAllCategoryRoles } = require("../modules/roles/roles.js");

module.exports = {
    data: { name: "button-role-category", type: "button", multi: "button-role-category" },
    async execute(interaction) {
        const [, action, categoryIndex] = interaction.customId.split(":");
        try {
            await interaction.deferUpdate();
            if (action === "remove-all") {
                const removed = await removeAllCategoryRoles(interaction.guild, interaction.user.id);
                return interaction.followUp({
                    content: removed ? `✅ **${removed}** rôle(s) de catégorie retiré(s).` : "❌ Tu n'as aucun rôle de catégorie.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            const { category } = await assignCategoryRole(
                interaction.guild,
                interaction.user.id,
                Number(categoryIndex),
                null,
            );
            await interaction.followUp({
                content: `✅ Rôle retiré pour **${category.name}**.`,
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            console.error("Erreur lors du retrait des rôles de catégorie:", error);
            await interaction.followUp({
                content: "❌ Impossible de retirer le rôle. Vérifie que le rôle du bot est placé au-dessus des rôles de niveau.",
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
