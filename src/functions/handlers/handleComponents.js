const { readdirSync } = require("fs");
const path = require("path");

module.exports = (client) => {
    client.handleComponents = async () => {
        const componentsPath = path.join(__dirname, "../..", "components");
        const componentFiles = readdirSync(componentsPath).filter(file => file.endsWith(".js"));
        const componentCollections = {
            button: client.buttons,
            modal: client.modals,
            selectMenu: client.selectMenus,
        };

        for (const file of componentFiles) {
            const component = require(path.join(componentsPath, file));
            const collection = componentCollections[component.data.type];

            if (!collection) {
                throw new Error(`Type de composant invalide dans ${file}`);
            }

            collection.set(component.data.name, component);
            if (component.data.multi) collection.set(component.data.multi, component);
        }
    };
};
