const {
    AttachmentBuilder,
    ContainerBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
} = require("discord.js");
const { Timestamp } = require("firebase-admin/firestore");
const { mkdir, readFile, unlink, writeFile } = require("fs/promises");
const path = require("path");
const { db } = require("../../functions/utils/firebase.js");
const { createReducedGalleryImage } = require("../search/tagImage.js");

const COLLECTION = "messagesAuto";
const CHECK_INTERVAL_MS = 30 * 1000;
const IMAGES_DIRECTORY = path.resolve(__dirname, "../../../config/messages-auto");

function toColorInt(color) {
    const value = parseInt(color.replace("#", ""), 16);
    return Number.isNaN(value) ? null : value;
}

function fromDocument(document) {
    return { id: document.id, ...document.data() };
}

async function loadAutomaticMessages(client) {
    const snapshot = await db.collection(COLLECTION).get();
    client.messagesAuto.clear();
    for (const document of snapshot.docs) {
        const message = fromDocument(document);
        if (message.enabled !== false) client.messagesAuto.set(message.id, message);
    }
    return client.messagesAuto;
}

async function createAutomaticMessage(data) {
    const reference = db.collection(COLLECTION).doc();
    const { imageUpload, ...messageData } = data;
    const storedImage = imageUpload
        ? await storeAutomaticMessageImage(imageUpload.url, data.guildId, reference.id, imageUpload.contentType)
        : { imagePath: null, imageName: null };
    await reference.set({
        ...messageData,
        ...storedImage,
        enabled: true,
        createdAt: Timestamp.now(),
        nextSendAt: Timestamp.fromMillis(data.startAt ?? Date.now() + data.durationMs),
    });
    const message = { id: reference.id, ...(await reference.get()).data() };
    return message;
}

async function deleteAutomaticMessage(client, messageId) {
    const current = client.messagesAuto.get(messageId)
        ?? (await db.collection(COLLECTION).doc(messageId).get()).data();
    await db.collection(COLLECTION).doc(messageId).delete();
    client.messagesAuto.delete(messageId);
    const storageCleanupSucceeded = await deleteStoredImage(current?.imagePath);
    return { storageCleanupFailed: !storageCleanupSucceeded };
}

async function updateAutomaticMessage(client, messageId, updates) {
    const { imageUpload, imagePreviewUrl, ...messageUpdates } = updates;
    const storedImage = imageUpload
        ? await storeAutomaticMessageImage(imageUpload.url, updates.guildId, messageId, imageUpload.contentType)
        : {};
    const data = { ...messageUpdates, ...storedImage, updatedAt: Timestamp.now() };
    await db.collection(COLLECTION).doc(messageId).update(data);
    const current = client.messagesAuto.get(messageId);
    const message = { ...current, ...data };
    client.messagesAuto.set(messageId, message);
    const storageCleanupSucceeded = storedImage.imagePath && storedImage.imagePath !== current?.imagePath
        ? await deleteStoredImage(current?.imagePath)
        : true;
    return { ...message, storageCleanupFailed: !storageCleanupSucceeded };
}

async function deleteStoredImage(imagePath) {
    if (!imagePath) return true;
    try {
        await unlink(path.resolve(__dirname, "../../..", imagePath));
        return true;
    } catch (error) {
        if (error.code === "ENOENT") return true;
        console.warn(`Impossible de supprimer l'image locale ${imagePath}:`, error.message);
        return false;
    }
}

function isDue(message) {
    return message.nextSendAt?.toMillis?.() <= Date.now();
}

function getNextSendAt(message, now = Date.now()) {
    let nextSendAtMs = message.nextSendAt.toMillis() + message.durationMs;
    while (nextSendAtMs <= now) nextSendAtMs += message.durationMs;
    return Timestamp.fromMillis(nextSendAtMs);
}

function buildAutomaticMessageContainer(message) {
    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${message.title}`),
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(message.description),
        );

    const accentColor = message.accentColor ? toColorInt(message.accentColor) : null;
    if (accentColor) container.setAccentColor(accentColor);

    if (message.imageUrl) {
        container.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder()
                    .setURL(message.imageUrl)
                    .setDescription(message.title),
            ),
        );
    }

    return container;
}

async function sendAutomaticMessage(client, message) {
    const channel = await client.channels.fetch(message.channelId);
    if (!channel?.isTextBased() || typeof channel.send !== "function") {
        throw new Error(`Le salon ${message.channelId} est introuvable ou ne permet pas l'envoi de messages.`);
    }

    const files = [];
    let displayMessage = message;
    if (message.imagePath) {
        const buffer = await readFile(path.resolve(__dirname, "../../..", message.imagePath));
        const fileName = message.imageName ?? "message-auto-image";
        files.push(new AttachmentBuilder(buffer, { name: fileName }));
        displayMessage = { ...message, imageUrl: `attachment://${fileName}` };
    } else if (message.imageUrl) {
        try {
            const buffer = await createReducedGalleryImage(message.imageUrl);
            const fileName = "message-auto-image.png";
            files.push(new AttachmentBuilder(buffer, { name: fileName }));
            displayMessage = { ...message, imageUrl: `attachment://${fileName}` };
        } catch (error) {
            console.warn("Impossible de réduire l'image du message automatique:", error.message);
        }
    }
    await channel.send({ components: [buildAutomaticMessageContainer(displayMessage)], files, flags: MessageFlags.IsComponentsV2 });
}

async function storeAutomaticMessageImage(imageUrl, guildId, documentId, contentType) {
    if (!imageUrl) return { imagePath: null, imageName: null };
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Impossible de télécharger l'image (${response.status}).`);
    const extension = contentType?.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "image";
    const imageName = `${guildId}_${documentId}.${extension}`;
    const imagePath = path.posix.join("config", "messages-auto", imageName);
    await mkdir(IMAGES_DIRECTORY, { recursive: true });
    await writeFile(path.join(IMAGES_DIRECTORY, imageName), Buffer.from(await response.arrayBuffer()));
    return { imagePath, imageName };
}

async function processAutomaticMessages(client) {
    const dueMessages = [...client.messagesAuto.values()].filter(isDue);
    for (const message of dueMessages) {
        try {
            await sendAutomaticMessage(client, message);
            console.log(`[${new Date().toLocaleString("fr-FR")}] Message automatique envoyé : ${message.title} (${message.id})`);
            const nextSendAt = getNextSendAt(message);
            await db.collection(COLLECTION).doc(message.id).update({ nextSendAt });
            client.messagesAuto.set(message.id, { ...message, nextSendAt });
        } catch (error) {
            console.error(`Erreur lors de l'envoi du message automatique ${message.id}:`, error);
        }
    }
}

async function startAutomaticMessages(client) {
    try {
        await loadAutomaticMessages(client);
        await processAutomaticMessages(client);
        setInterval(() => processAutomaticMessages(client), CHECK_INTERVAL_MS).unref();
        console.log(`${client.messagesAuto.size} message(s) automatique(s) chargé(s).`);
    } catch (error) {
        console.error("Impossible de charger les messages automatiques:", error);
    }
}

module.exports = {
    buildAutomaticMessageContainer,
    createAutomaticMessage,
    deleteAutomaticMessage,
    storeAutomaticMessageImage,
    startAutomaticMessages,
    updateAutomaticMessage,
};
