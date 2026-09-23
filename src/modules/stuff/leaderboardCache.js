const { createHash } = require("crypto");
const { mkdir, readdir, readFile, unlink, writeFile } = require("fs/promises");
const path = require("path");
const logger = require("../../functions/utils/Logger");
const { drawLeaderboardImage } = require("./leaderboardImage.js");

const IMAGES_DIR = path.resolve(__dirname, "../../../config/images");
const HASH_FILE = path.resolve(IMAGES_DIR, "gs_classement_hash.json");
const PER_PAGE = 10;
const SEND_DELAY_MS = 500;

async function ensureImagesDir() {
    try {
        await mkdir(IMAGES_DIR, { recursive: true });
    } catch (error) {
        if (error.code !== "EEXIST") {
            throw error;
        }
    }
}

async function getLastDataHash() {
    try {
        const hashData = await readFile(HASH_FILE, "utf-8");
        const parsed = JSON.parse(hashData);
        return parsed.lastHash;
    } catch (error) {
        if (error.code === "ENOENT") {
            return null;
        }
        logger.error(`Erreur lors de la lecture du hash : ${error.message}`);
        throw error;
    }
}

async function saveDataHash(hash, totalPages) {
    try {
        await ensureImagesDir();
        const hashData = {
            lastHash: hash,
            totalPages: totalPages,
        };
        await writeFile(HASH_FILE, JSON.stringify(hashData, null, 2), "utf-8");
    } catch (error) {
        logger.error(`Erreur lors de la sauvegarde du hash : ${error.message}`);
        throw error;
    }
}

function calculateDataHash(players) {
    const dataString = [...players]
        .sort((a, b) => a.discordId.localeCompare(b.discordId))
        .map((p) => `${p.discordId}:${p.ap}:${p.dp}:${p.gs}:${p.updatedAt}`)
        .join("|");
    return createHash("sha256").update(dataString).digest("hex");
}

async function needsRegeneration(players) {
    const currentHash = calculateDataHash(players);
    const lastHash = await getLastDataHash();
    return currentHash !== lastHash;
}

async function generateAllPages(players) {
    try {
        await ensureImagesDir();
        const totalPages = Math.ceil(players.length / PER_PAGE);
        
        for (let page = 1; page <= totalPages; page++) {
            const image = await drawLeaderboardImage(players, null, page, PER_PAGE, false);
            const imagePath = path.resolve(IMAGES_DIR, `gs_classement_page_${page}.png`);
            await writeFile(imagePath, image);
        }
        
        return totalPages;
    } catch (error) {
        logger.error(`Erreur lors de la génération des pages : ${error.message}`);
        throw error;
    }
}

async function deleteCachedImages() {
    try {
        const files = await readdir(IMAGES_DIR);
        
        for (const file of files) {
            if (file.startsWith("gs_classement_page_") && file.endsWith(".png")) {
                const filePath = path.resolve(IMAGES_DIR, file);
                await unlink(filePath);
            }
        }
    } catch (error) {
        logger.error(`Erreur lors de la suppression du cache : ${error.message}`);
        throw error;
    }
}

async function sendCachedImages(channel, userId, username) {
    try {
        const hashData = await readFile(HASH_FILE, "utf-8");
        const parsed = JSON.parse(hashData);
        const totalPages = parsed.totalPages;
        
        logger.log(`Envoi de ${totalPages} pages par ${username} (${userId})`);
        
        for (let page = 1; page <= totalPages; page++) {
            const imagePath = path.resolve(IMAGES_DIR, `gs_classement_page_${page}.png`);
            
            try {
                await channel.send({
                    files: [{ attachment: imagePath, name: `gs_classement_page_${page}.png` }],
                });
                
                if (page < totalPages) {
                    await new Promise(resolve => setTimeout(resolve, SEND_DELAY_MS));
                }
            } catch (error) {
                logger.warn(`Erreur lors de l'envoi de la page ${page} : ${error.message}`);
            }
        }
    } catch (error) {
        logger.error(`Erreur lors de l'envoi des images : ${error.message}`);
        throw error;
    }
}

module.exports = {
    getLastDataHash,
    saveDataHash,
    calculateDataHash,
    needsRegeneration,
    generateAllPages,
    deleteCachedImages,
    sendCachedImages,
};
