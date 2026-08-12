// list-indexed-pages.mjs
// Script de diagnostic autonome (indépendant du bot) : liste toutes les
// pages effectivement indexées dans le bundle Pagefind, avec leur URL.
//
// Astuce : on cherche un mot présent sur TOUTES les pages du site (le nom
// du site, affiché dans le footer de chaque page) pour faire remonter
// l'intégralité de l'index plutôt qu'une recherche ciblée.
//
// npm install playwright
// node list-indexed-pages.mjs

import { chromium } from "playwright";
import "dotenv/config";

const SITE_URL = process.env.SITE_URL?.replace(/\/$/, "");
// Mot présent sur toutes les pages (nom du site dans le footer).
// Change-le si besoin pour un mot que tu es sûr de trouver partout.
const PROBE_TERM = "Gear Progression";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(SITE_URL + "/", { waitUntil: "domcontentloaded" });

  const results = await page.evaluate(async (term) => {
    const pagefind = await import("/pagefind/pagefind.js");
    const search = await pagefind.search(term);
    // Pagefind renvoie TOUS les résultats correspondants, pas juste les
    // premiers — on récupère donc tout, sans slice().
    return Promise.all(search.results.map((r) => r.data()));
  }, PROBE_TERM);

  console.log(`\n${results.length} page(s) indexée(s) trouvée(s) pour le terme "${PROBE_TERM}" :\n`);
  for (const r of results.sort((a, b) => a.url.localeCompare(b.url))) {
    console.log(`- ${r.meta?.title ?? "(sans titre)"}  ->  ${r.url}`);
  }

  await browser.close();
}

main().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});
