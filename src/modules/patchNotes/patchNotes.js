const { ContainerBuilder, MessageFlags, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } = require("discord.js");
const { readFile, writeFile } = require("fs/promises");
const path = require("path");
const logger = require("../../functions/utils/Logger");
const { toColorInt } = require("../../functions/utils/toColorInt.js");
const config = require("../../../config/config.json");

const PATCH_NOTES_FILE = path.resolve(__dirname, "../../../PATCH_NOTES.md");
const LAST_VERSION_FILE = path.resolve(__dirname, "../../../config/lastPatchNoteVersion.json");
const PACKAGE_JSON_FILE = path.resolve(__dirname, "../../../package.json");

async function getCurrentVersion() {
    try {
        const packageJson = await readFile(PACKAGE_JSON_FILE, "utf-8");
        const packageData = JSON.parse(packageJson);
        return packageData.version;
    } catch (error) {
        logger.error(`Erreur lors de la lecture de package.json : ${error.message}`);
        throw error;
    }
}

async function getLastSentVersion() {
    try {
        const lastVersionData = await readFile(LAST_VERSION_FILE, "utf-8");
        const lastVersion = JSON.parse(lastVersionData);
        return lastVersion.lastVersion;
    } catch (error) {
        if (error.code === "ENOENT") {
            return null;
        }
        logger.error(`Erreur lors de la lecture de lastPatchNoteVersion.json : ${error.message}`);
        throw error;
    }
}

async function saveLastSentVersion(version) {
    try {
        await writeFile(LAST_VERSION_FILE, JSON.stringify({ lastVersion: version }, null, 2), "utf-8");
    } catch (error) {
        logger.error(`Erreur lors de l'écriture de lastPatchNoteVersion.json : ${error.message}`);
        throw error;
    }
}

async function getPatchNotesContent() {
    try {
        const content = await readFile(PATCH_NOTES_FILE, "utf-8");
        return content;
    } catch (error) {
        if (error.code === "ENOENT") {
            logger.log("Fichier PATCH_NOTES.md non trouvé, passage des patch notes");
            return null;
        }
        logger.error(`Erreur lors de la lecture de PATCH_NOTES.md : ${error.message}`);
        throw error;
    }
}

function buildPatchNotesContainer(version, content) {
    const accentColor = toColorInt(config.color.green) || 0x43c849;
    
    return new ContainerBuilder()
        .setAccentColor(accentColor)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## Patch Notes - v${version}`)
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(content)
        );
}

async function sendPatchNotesToOwner(client, ownerId, container) {
    try {
        const user = await client.users.fetch(ownerId);
        await user.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
        logger.log(`Patch notes envoyées à ${user.tag} (${ownerId})`);
    } catch (error) {
        logger.warn(`Impossible d'envoyer les patch notes à ${ownerId} : ${error.message}`);
    }
}

async function sendPatchNotesIfVersionChanged(client) {
    try {
        const patchNotesContent = await getPatchNotesContent();
        if (!patchNotesContent) {
            return;
        }

        const currentVersion = await getCurrentVersion();
        const lastSentVersion = await getLastSentVersion();

        if (lastSentVersion === currentVersion) {
            logger.log(`Version ${currentVersion} déjà envoyée, passage des patch notes`);
            return;
        }

        logger.log(`Nouvelle version détectée : ${currentVersion} (dernière envoyée : ${lastSentVersion || "jamais"})`);
        
        const container = buildPatchNotesContainer(currentVersion, patchNotesContent);
        
        const guilds = client.guilds.cache;
        const ownerIds = new Set();
        
        for (const guild of guilds.values()) {
            if (guild.ownerId) {
                ownerIds.add(guild.ownerId);
            }
        }

        logger.log(`Envoi des patch notes à ${ownerIds.size} propriétaires de serveur`);
        
        for (const ownerId of ownerIds) {
            await sendPatchNotesToOwner(client, ownerId, container);
        }

        await saveLastSentVersion(currentVersion);
        logger.log(`Patch notes v${currentVersion} envoyées avec succès`);
    } catch (error) {
        logger.error(`Erreur lors de l'envoi des patch notes : ${error.message}`);
    }
}

module.exports = { sendPatchNotesIfVersionChanged };
