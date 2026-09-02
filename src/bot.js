require('dotenv').config();
const { TOKEN } = process.env;
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { readdirSync } = require("fs");

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
