const { initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");

if (getApps().length === 0) {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS est manquant. Renseigne dans .env le chemin absolu vers le fichier JSON du compte de service Firebase.");
  }
  initializeApp({ storageBucket: process.env.FIREBASE_STORAGE_BUCKET });
}

const db = getFirestore();
const storage = getStorage();

module.exports = { db, storage };
