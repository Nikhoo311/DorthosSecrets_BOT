const MiniSearch = require("minisearch");

const SITE_URL = process.env.SITE_URL?.replace(/\/$/, "");
const PAGES_INDEX_URL = process.env.PAGES_INDEX_URL || `${SITE_URL}/pages.json`;
const SEARCH_TIMEOUT_MS = 8000;
const TTL_MS = 5 * 60 * 1000;

let miniSearch = null;
let fetchedAt = 0;
let hasTags = false;

function normalisePage(page, id) {
  if (!page || !["guide", "tool"].includes(page.type) || typeof page.url !== "string") return null;
  const title = typeof page.title === "string" ? page.title : "Sans titre";

  return {
    id,
    type: page.type,
    title,
    description: typeof page.description === "string" ? page.description : "",
    content: typeof page.content === "string" ? page.content : "",
    tags: Array.isArray(page.tags) ? page.tags.filter((tag) => typeof tag === "string") : [],
    url: new URL(page.url, SITE_URL).href,
    image: typeof page.image === "string" ? new URL(page.image, SITE_URL).href : null,
  };
}

async function getIndex() {
  if (miniSearch && Date.now() - fetchedAt < TTL_MS) return miniSearch;
  if (!SITE_URL) throw new Error("SITE_URL est manquant.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const response = await fetch(PAGES_INDEX_URL, { signal: controller.signal });
    if (!response.ok) throw new Error(`Impossible de charger l'index JSON (${response.status}).`);

    const payload = await response.json();
    if (!Array.isArray(payload)) throw new Error("L'index JSON doit être une liste de pages.");

    hasTags = payload.some((page) => Array.isArray(page?.tags) && page.tags.length > 0);
    const pages = payload.map(normalisePage).filter(Boolean);
    miniSearch = new MiniSearch({
      fields: ["title", "description", "content"],
      storeFields: ["title", "description", "url", "image", "type", "tags"],
      searchOptions: {
        boost: { description: 3, content: 2, title: 1 },
        fuzzy: 0.2,
        prefix: true,
      },
    });
    miniSearch.addAll(pages);
    fetchedAt = Date.now();
    return miniSearch;
  } finally {
    clearTimeout(timeout);
  }
}

async function searchSite(query, { limit = 5, tag } = {}) {
  const index = await getIndex();
  const tagNeedle = tag?.toLocaleLowerCase("fr");

  return index
    .search(query, { fuzzy: 0.2, prefix: true })
    .filter((result) => !tagNeedle || !hasTags || result.tags.some((value) => value.toLocaleLowerCase("fr") === tagNeedle))
    .slice(0, limit)
    .map((result) => ({
      title: result.title,
      type: result.type,
      description: result.description,
      url: result.url,
      image: result.image,
      tags: result.tags,
    }));
}

module.exports = { searchSite };
