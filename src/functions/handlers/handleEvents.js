const { readdirSync } = require("fs");
const logger = require("../utils/Logger");
const path = require("path");

module.exports = (client) => {
    client.handleEvents = async() => {
        const eventsPath = path.join(__dirname, "..", "..", "events");
        const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.js'));

        for (const file of eventFiles) {
            const filePath = path.join(eventsPath, file);
            const event = require(filePath);
            logger.event(`${event.name} est charger avec succès !`)
            if (event.once) client.once(event.name, (...args) => event.execute(...args, client));
            else client.on(event.name, (...args) => event.execute(...args, client));
        }
    }
}
