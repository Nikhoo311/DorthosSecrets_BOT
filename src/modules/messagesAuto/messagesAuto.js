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
const { randomUUID } = require("crypto");
const { db, storage } = require("../../functions/utils/firebase.js");
const { createReducedGalleryImage } = require("../search/tagImage.js");

const COLLECTION = "messagesAuto";
const CHECK_INTERVAL_MS = 30 * 1000;

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
    const reference = await db.collection(COLLECTION).add({
        ...data,
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
    const data = { ...updates, updatedAt: Timestamp.now() };
    await db.collection(COLLECTION).doc(messageId).update(data);
    const current = client.messagesAuto.get(messageId);
    const message = { ...current, ...data };
    client.messagesAuto.set(messageId, message);
    const storageCleanupSucceeded = updates.imagePath && updates.imagePath !== current?.imagePath
        ? await deleteStoredImage(current?.imagePath)
        : true;
    return { ...message, storageCleanupFailed: !storageCleanupSucceeded };
}

async function deleteStoredImage(imagePath) {
    if (!imagePath) return true;
    try {
        await storage.bucket().file(imagePath).delete({ ignoreNotFound: true });
        return true;
    } catch (error) {
        console.warn(`Impossible de supprimer l'image Storage ${imagePath}:`, error.message);
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
        const [buffer] = await storage.bucket().file(message.imagePath).download();
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

async function storeAutomaticMessageImage(imageUrl, guildId, contentType) {
    if (!imageUrl) return { imagePath: null, imageName: null };
    if (!process.env.FIREBASE_STORAGE_BUCKET) throw new Error("STORAGE_NOT_CONFIGURED");

    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Impossible de télécharger l'image (${response.status}).`);
    const extension = contentType?.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "image";
    const imageName = `message-auto-${randomUUID()}.${extension}`;
    const imagePath = `messages-auto/${guildId}/${imageName}`;
    await storage.bucket().file(imagePath).save(Buffer.from(await response.arrayBuffer()), {
        resumable: false,
        metadata: { contentType: contentType || response.headers.get("content-type") || "application/octet-stream" },
    });
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
