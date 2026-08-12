const { InteractionType, MessageFlags } = require('discord.js');

module.exports = {
    name: "interactionCreate",
    async execute(interaction, client) {
        if(interaction.isChatInputCommand()) {
            const { commands } = client;
            const { commandName } = interaction;
            const command = commands.get(commandName)
            if(!command) return;

            try {
                await command.execute(interaction, client);
                
            } catch (error) {
                console.error(error);
                await interaction.reply({
                    content: ":x: ⚠️ Une erreur est survenue lors de l'exécution de la commande !",
                    flags: [MessageFlags.Ephemeral]
                });
            }
        } 
        else if (interaction.isButton()){
            const { buttons } = client;
            const { customId } = interaction;
            const button = buttons.get(customId);

            if (!button) return new Error("The is no code for this button!")

            try {
                await button.execute(interaction, client)
            } catch (err) {
                console.error(err);
            }
        }
        else if (interaction.type == InteractionType.ModalSubmit){
            const { modals } = client;
            const { customId } = interaction;
            const modal = modals.get(customId);
            if(!modal) return new Error("There is no code for this modal");
            try {
                await modal.execute(interaction, client);
            } catch (error) {
                console.error(error);
            } 
        }
        else if (interaction.type == InteractionType.ApplicationCommandAutocomplete) {
            const { commands } = client;
            const { commandName } = interaction;
            const command = commands.get(commandName);
            if (!command) return new Error("There is no code for this applicationCommandAutocomplete");

            try {
                await command.autocomplete(interaction, client);
            } catch (error) {
                console.error(error);
            }
        }
        else if (interaction.isStringSelectMenu() || interaction.isUserSelectMenu()) {
            const { selectMenus } = client;
            const { customId } = interaction;
            const menu = selectMenus.get(customId);
            if (!menu) return new Error("There is no code for this selectMenu");

            try {
                await menu.execute(interaction, client);
            } catch (error) {
                console.error(error)
            }
        }
    }
}