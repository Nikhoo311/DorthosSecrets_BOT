const logger = require("../functions/utils/Logger");

module.exports = {
    name: "clientReady",
    once: true,
    async execute(client) {
        logger.clientStart(`${client.user.tag} est en ligne !`)
    }
}