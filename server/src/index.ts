import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { optionalAuth } from "./lib.js";
import authRoutes from "./routes/auth.js";
import catalogRoutes from "./routes/catalog.js";
import meRoutes from "./routes/me.js";
import adminRoutes from "./routes/admin.js";
import { ensureSearchIndex } from "./search.js";

const app = express();
const PORT = Number(process.env.PORT || 4000);
// Behind a reverse proxy or a Cloudflare tunnel, HOST=127.0.0.1 keeps the port off the network.
const HOST = process.env.HOST || "0.0.0.0";
// Comma-separated web origins allowed to call the API (the mobile app sends none). Empty: any origin.
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.disable("x-powered-by");
app.use(cors(CORS_ORIGINS.length ? { origin: CORS_ORIGINS } : undefined));
app.use(express.json({ limit: "5mb" }));
app.use(optionalAuth);

app.get("/api/health", (_req, res) => res.json({ ok: true, name: "Myschool API", time: new Date().toISOString() }));
app.use("/api/auth", authRoutes);
app.use("/api", catalogRoutes);
app.use("/api/me", meRoutes);
app.use("/api/admin", adminRoutes);

// Serve the built web app in production (web/dist). Built assets have a hash in their name: cached for good, and a
// missing one is a 404 (not index.html, which a CDN would then cache under a .js URL). index.html is revalidated on
// every visit so that a new version is picked up at once.
const webDist = path.resolve(__dirname, "../../web/dist");
if (fs.existsSync(webDist)) {
  app.use("/assets", express.static(path.join(webDist, "assets"), { immutable: true, maxAge: "1y", fallthrough: false }));
  app.use(express.static(webDist, { index: false, setHeaders: (res) => res.setHeader("Cache-Control", "no-cache") }));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(webDist, "index.html"));
  });
}

app.use((req, res) => res.status(404).json({ error: `Route introuvable: ${req.method} ${req.path}` }));

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status || err.statusCode || (err.code === "P2025" ? 404 : 500);
  if (status === 500) console.error(err);
  res.status(status).json({ error: err.message || "Erreur serveur" });
});

app.listen(PORT, HOST, () => {
  console.log(`Myschool API prête sur http://localhost:${PORT}`);
  ensureSearchIndex().catch((err) => console.error("Index de recherche :", err));
});
