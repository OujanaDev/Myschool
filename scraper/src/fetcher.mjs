import robotsParser from "robots-parser";
import { log, sleep } from "./util.mjs";

export const USER_AGENT =
  process.env.SCRAPER_USER_AGENT || "MyschoolScraper/1.0 (+https://myschool.ma; contact: admin@myschool.ma)";
const DELAY_MS = Number(process.env.SCRAPER_DELAY_MS || 1500);
const TIMEOUT_MS = Number(process.env.SCRAPER_TIMEOUT_MS || 20000);

const robotsCache = new Map();
const lastRequestAt = new Map(); // per origin

async function fetchRaw(url, accept) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept, "accept-language": "fr,ar;q=0.8,en;q=0.5" },
      redirect: "follow",
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

async function robotsFor(url) {
  const origin = new URL(url).origin;
  if (robotsCache.has(origin)) return robotsCache.get(origin);
  const robotsUrl = `${origin}/robots.txt`;
  let parser = null;
  try {
    const res = await fetchRaw(robotsUrl, "text/plain,*/*;q=0.5");
    parser = res.ok ? robotsParser(robotsUrl, await res.text()) : null;
  } catch {
    parser = null;
  }
  robotsCache.set(origin, parser);
  return parser;
}

/** Polite fetch: honours robots.txt (Disallow + Crawl-delay), spaces requests per origin, retries transient errors. */
async function politeFetch(url, accept, { retries = 2 } = {}) {
  const robots = await robotsFor(url);
  if (robots && robots.isAllowed(url, USER_AGENT) === false) {
    throw Object.assign(new Error(`Bloqué par robots.txt : ${url}`), { fatal: true });
  }
  const origin = new URL(url).origin;
  const crawlDelay = (robots?.getCrawlDelay(USER_AGENT) || 0) * 1000;
  const delay = Math.max(DELAY_MS, crawlDelay);
  for (let attempt = 0; ; attempt++) {
    const wait = (lastRequestAt.get(origin) || 0) + delay - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt.set(origin, Date.now());
    try {
      const res = await fetchRaw(url, accept);
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { fatal: true });
      return res;
    } catch (err) {
      if (err.fatal || attempt >= retries) throw err;
      log(`  nouvel essai (${attempt + 1}/${retries}) après erreur : ${err.message}`);
      await sleep(delay * (attempt + 2));
    }
  }
}

export async function fetchHtml(url, opts) {
  const res = await politeFetch(url, "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5", opts);
  const type = res.headers.get("content-type") || "";
  if (!/html|xml/i.test(type)) throw Object.assign(new Error(`Pas une page HTML (${type})`), { fatal: true });
  return { html: await res.text(), finalUrl: res.url || url };
}

/** Downloads a binary file (PDF…). Returns the bytes, final URL, content type and server-suggested file name. */
export async function fetchBinary(url, opts) {
  const res = await politeFetch(url, "application/pdf,application/octet-stream,*/*;q=0.5", opts);
  const disposition = res.headers.get("content-disposition") || "";
  const fileName = (disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i) || [])[1] || "";
  return {
    buffer: Buffer.from(await res.arrayBuffer()),
    finalUrl: res.url || url,
    contentType: res.headers.get("content-type") || "",
    fileName: decodeURIComponent(fileName).trim(),
  };
}
