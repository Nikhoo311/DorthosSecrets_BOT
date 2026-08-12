require('dotenv').config();
const { TOKEN, DB_URL } = process.env;
const { Client, Collection } = require('discord.js');
const { readdirSync } = require("fs");

const client = new Client({ intents: 3276799 });
client.commands = new Collection();
client.buttons = new Collection();
client.selectMenus = new Collection();
client.modals = new Collection();

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