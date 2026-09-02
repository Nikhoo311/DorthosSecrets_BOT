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
const { mkdir, readFile, unlink, writeFile } = require("fs/promises");
const { randomUUID } = require("crypto");
const path = require("path");
const { supabase } = require("../../functions/utils/supabase.js");
const { createReducedGalleryImage } = require("../search/tagImage.js");

const TABLE = "messages_auto";
const CHECK_INTERVAL_MS = 30 * 1000;
const IMAGES_DIRECTORY = path.resolve(__dirname, "../../../config/messages-auto");

function toColorInt(color) {
    const value = parseInt(color.replace("#", ""), 16);
    return Number.isNaN(value) ? null : value;
}

// Postgres est en snake_case, le reste du bot en camelCase. `durationInput`
// et `createdBy` (passés à la création/mise à jour) ne sont volontairement
// PAS persistés : rien ne les relit jamais depuis un message stocké, seul le
// `pending` en mémoire (Map du client) est consulté pour ces champs — voir
// modal-message-auto-content.js et button-message-auto.js.
function fromRow(row) {
    return {
        id: row.id,
        guildId: row.guild_id,
        channelId: row.channel_id,
        title: row.title,
        description: row.description,
        accentColor: row.accent_color,
        imageUrl: row.image_url,
        imagePath: row.image_path,
        imageName: row.image_name,
        durationMs: row.duration_ms,
        enabled: row.enabled,
        // Chaînes ISO côté Postgres (Firestore renvoyait des Timestamp) —
        // gardées telles quelles : `isDue`/`getNextSendAt` ci-dessous ne font
        // plus appel à `.toMillis()`, contrairement à l'ancienne version.
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        nextSendAt: row.next_send_at,
    };
}

function unwrap(operation, { data, error }) {
    if (error) {
        const wrapped = new Error(`[messagesAuto] ${operation} a échoué : ${error.message}`);
        wrapped.cause = error;
        throw wrapped;
    }
    return data;
}

async function loadAutomaticMessages(client) {
    const rows = unwrap("loadAutomaticMessages", await supabase.from(TABLE).select("*").eq("enabled", true));
    client.messagesAuto.clear();
    for (const row of rows ?? []) {
        const message = fromRow(row);
        client.messagesAuto.set(message.id, message);
    }
    return client.messagesAuto;
}

async function createAutomaticMessage(data) {
    const { imageUpload, durationInput, createdBy, ...messageData } = data;

    // L'id est généré ICI, avant tout téléchargement — comme Firestore le
    // faisait avec `db.collection().doc()` (qui réserve un id sans écrire).
    // Si le téléchargement de l'image échoue, on sort en erreur AVANT
    // d'insérer quoi que ce soit : pas de ligne orpheline sans image.
    const id = randomUUID();
    const storedImage = imageUpload
        ? await storeAutomaticMessageImage(imageUpload.url, data.guildId, id, imageUpload.contentType)
        : { imagePath: null, imageName: null };

    const inserted = unwrap(
        "createAutomaticMessage",
        await supabase
            .from(TABLE)
            .insert({
                id,
                guild_id: messageData.guildId,
                channel_id: messageData.channelId,
                title: messageData.title,
                description: messageData.description,
                accent_color: messageData.accentColor ?? null,
                image_path: storedImage.imagePath,
                image_name: storedImage.imageName,
                duration_ms: messageData.durationMs,
                enabled: true,
                next_send_at: new Date(messageData.startAt ?? Date.now() + messageData.durationMs).toISOString(),
            })
            .select("*")
            .single()
    );

    return fromRow(inserted);
}

async function deleteAutomaticMessage(client, messageId) {
    const current =
        client.messagesAuto.get(messageId) ??
        fromRow(unwrap("deleteAutomaticMessage (read)", await supabase.from(TABLE).select("*").eq("id", messageId).maybeSingle()) ?? {});
    unwrap("deleteAutomaticMessage", await supabase.from(TABLE).delete().eq("id", messageId));
    client.messagesAuto.delete(messageId);
    const storageCleanupSucceeded = await deleteStoredImage(current?.imagePath);
    return { storageCleanupFailed: !storageCleanupSucceeded };
}

async function updateAutomaticMessage(client, messageId, updates) {
    const { imageUpload, imagePreviewUrl, nextSendAt, ...messageUpdates } = updates;
    const current = client.messagesAuto.get(messageId);
    const storedImage = imageUpload
        ? await storeAutomaticMessageImage(imageUpload.url, updates.guildId, messageId, imageUpload.contentType)
        : {};

    const row = {
        ...(messageUpdates.title !== undefined && { title: messageUpdates.title }),
        ...(messageUpdates.description !== undefined && { description: messageUpdates.description }),
        ...(messageUpdates.accentColor !== undefined && { accent_color: messageUpdates.accentColor }),
        ...(messageUpdates.channelId !== undefined && { channel_id: messageUpdates.channelId }),
        ...(messageUpdates.durationMs !== undefined && { duration_ms: messageUpdates.durationMs }),
        ...(storedImage.imagePath && { image_path: storedImage.imagePath, image_name: storedImage.imageName }),
        // `nextSendAt` peut arriver soit en Date (bouton "save", voir
        // button-message-auto.js), soit absent (l'édition ne touche pas la
        // planification tant qu'on n'a pas cliqué "Enregistrer").
        ...(nextSendAt && { next_send_at: new Date(nextSendAt).toISOString() }),
        updated_at: new Date().toISOString(),
    };

    const updated = unwrap(
        "updateAutomaticMessage",
        await supabase.from(TABLE).update(row).eq("id", messageId).select("*").single()
    );
    const message = fromRow(updated);
    client.messagesAuto.set(messageId, message);

    const storageCleanupSucceeded =
        storedImage.imagePath && storedImage.imagePath !== current?.imagePath
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
    return new Date(message.nextSendAt).getTime() <= Date.now();
}

function getNextSendAt(message, now = Date.now()) {
    let nextSendAtMs = new Date(message.nextSendAt).getTime() + message.durationMs;
    while (nextSendAtMs <= now) nextSendAtMs += message.durationMs;
    return new Date(nextSendAtMs).toISOString();
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
            unwrap(
                "processAutomaticMessages",
                await supabase.from(TABLE).update({ next_send_at: nextSendAt }).eq("id", message.id)
            );
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
