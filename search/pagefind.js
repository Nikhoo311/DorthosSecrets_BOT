const { getSearchPage, resetSearchPage } = require("./browser.js");

const SITE_URL = process.env.SITE_URL?.replace(/\/$/, "");
const SEARCH_TIMEOUT_MS = 8000;

// Pages "listing" (sommaires de catégorie) à exclure des résultats : elles
// contiennent des bouts de tous les guides/outils à la fois et peuvent donc
// bien matcher n'importe quelle recherche sans être la bonne réponse précise.
const LISTING_PATHS = new Set(["/guides", "/tools"]);
const CATEGORY_PATHS = {
  guide: "/guides/",
  outil: "/tools/",
};

function isListingPage(url) {
  try {
    const path = new URL(url, SITE_URL).pathname.replace(/\/$/, ""); // enlève le / final
    return LISTING_PATHS.has(path);
  } catch {
    return false;
  }
}

function belongsToCategory(url, category) {
  if (category === "tout") return true;

  try {
    return new URL(url, SITE_URL).pathname.startsWith(CATEGORY_PATHS[category]);
  } catch {
    return false;
  }
}

// Mots vides français à retirer d'une phrase de recherche, pour ne garder
// que les mots-clés porteurs de sens avant de les envoyer à Pagefind.
const STOPWORDS = new Set([
  "le", "la", "les", "un", "une", "des", "de", "du", "et", "en", "à", "a",
  "au", "aux", "ce", "ces", "cette", "cet", "pour", "par", "sur", "dans",
  "avec", "sans", "ou", "que", "qui", "quoi", "dont", "est", "sont",
  "être", "avoir", "ai", "as", "ont", "je", "tu", "il", "elle", "nous",
  "vous", "ils", "elles", "mon", "ma", "mes", "ton", "ta", "tes", "son",
  "sa", "ses", "leur", "leurs", "se", "ne", "pas", "plus", "moins",
  "comment", "quel", "quelle", "quels", "quelles", "on", "si", "mais",
  "donc", "or", "ni", "car", "tout", "tous", "toute", "toutes", "aussi",
  "comme", "faire", "fais", "fait", "bien", "très", "peu", "y", "svp",
  "stp", "merci", "aimerais", "voudrais", "peux", "pouvez",
  "qu", "j", "l", "d", "n", "m", "s", "t", "c", "qu'",
]);

function extractKeywords(query) {
  const words = query
    .toLowerCase()
    .replace(/['’]/g, " ")
    .replace(/[^\p{L}0-9\s-]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));

  return words.length > 0 ? words.join(" ") : query;
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Recherche Pagefind : timeout dépassé")), ms)
    ),
  ]);
}

async function searchSite(query, limit = 5, category = "tout") {
  const page = await getSearchPage();
  const cleanedQuery = extractKeywords(query);

  try {
    // On récupère un peu plus de résultats que demandé en interne, pour
    // avoir de la marge une fois les pages listing filtrées.
    const fetchCount = Math.max(limit * 3, 8);

    const results = await withTimeout(
      page.evaluate(
        async ({ query, fetchCount }) => {
          const pagefind = await import("/pagefind/pagefind.js");
          const search = await pagefind.search(query);
          const top = search.results.slice(0, fetchCount);
          return Promise.all(top.map((r) => r.data()));
        },
        { query: cleanedQuery, fetchCount }
      ),
      SEARCH_TIMEOUT_MS
    );

    // DEBUG temporaire : affiche l'URL brute renvoyée par Pagefind pour
    // chaque résultat, AVANT tout filtrage/traitement de notre côté.
    // Utile pour vérifier si le souci vient du bundle Pagefind lui-même ou
    // de notre code. À retirer une fois le diagnostic fait.
    console.log("[debug pagefind] résultats bruts:", results.map((r) => ({ title: r.meta?.title, url: r.url })));

    const filtered = results.filter(
      (result) => !isListingPage(result.url) && belongsToCategory(result.url, category)
    );

    return filtered.slice(0, limit).map((r) => ({
      title: r.meta?.title ?? "Sans titre",
      url: SITE_URL + r.url,
      excerpt: r.excerpt?.replace(/<\/?mark>/g, "**"), // <mark> -> gras Discord
      image: r.meta?.image ? SITE_URL + r.meta.image : null,
    }));
  } catch (err) {
    resetSearchPage();
    throw err;
  }
}

module.exports = { searchSite };
