const { chromium } = require("playwright");

const SITE_URL = process.env.SITE_URL;
let browserPromise = null;
let pagePromise = null;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true });
  }
  return browserPromise;
}

async function getSearchPage() {
  if (!pagePromise) {
    pagePromise = (async () => {
      const browser = await getBrowser();
      const page = await browser.newPage();
      // Same-origin : les fetch() internes de pagefind.js restent en HTTPS,
      // pas de souci CORS ni de scheme file://.
      await page.goto(SITE_URL, { waitUntil: "domcontentloaded" });
      return page;
    })();
  }
  return pagePromise;
}

// À appeler si la page/le navigateur crashe, pour forcer une relance propre.
function resetSearchPage() {
  pagePromise = null;
}

// Permet de détecter un crash Chromium et de forcer une relance complète.
async function watchBrowserCrash(onDisconnect) {
  const browser = await getBrowser();
  browser.on("disconnected", () => {
    browserPromise = null;
    pagePromise = null;
    if (onDisconnect) onDisconnect();
  });
}

module.exports = {
  getSearchPage,
  resetSearchPage,
  watchBrowserCrash
};
