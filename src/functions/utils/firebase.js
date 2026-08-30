const { initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

if (getApps().length === 0) {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS est manquant. Renseigne dans .env le chemin absolu vers le fichier JSON du compte de service Firebase.");
  }
  initializeApp();
}

const db = getFirestore();

module.exports = { db };
