require('dotenv').config();
const { TOKEN } = process.env;
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { readdirSync } = require("fs");

// Intents explicitement listés (l'ancien 3276799 demandait tout, dont deux
// intents privilégiés inutilisés — d'où l'erreur "Used disallowed intents"
// sur toute application où les cases ne sont pas cochées).
//
// GuildMembers est PRIVILÉGIÉ et indispensable : sans lui, l'événement
// guildMemberAdd (message de bienvenue) ne se déclenche jamais. Il doit être
// activé dans le portail développeur de CHAQUE application utilisée
// (Bot → Privileged Gateway Intents → Server Members Intent).
//
// Volontairement absents, car aucun code ne s'en sert :
//   - GuildPresences (privilégié) : aucun suivi de présence.
//   - MessageContent (privilégié) : le bot n'a jamais besoin de LIRE le
//     contenu d'un message. À rajouter uniquement si ça change un jour.
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
    ],
});
client.commands = new Collection();
client.buttons = new Collection();
client.selectMenus = new Collection();
client.modals = new Collection();
client.messagesAuto = new Collection();
client.pendingAutomaticMessageUpdates = new Collection();
client.pendingAutomaticMessageCreations = new Collection();
client.pendingConfigurationUpdates = new Collection();

client.commandArray = []

let functionFolder = readdirSync(`./src/functions`);
functionFolder = functionFolder.filter(f => f !== "utils");
for (const folder of functionFolder) {  
    const functionFiles = readdirSync(`./src/functions/${folder}`).filter((file) => file.endsWith('.js'));

    for (const file of functionFiles)
        require(`./functions/${folder}/${file}`)(client);
}
client.handleEvents();
client.handleCommands();
client.handleComponents();
client.login(TOKEN);
