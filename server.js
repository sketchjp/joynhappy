import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =====================================================
   ALLOW IFRAME EMBEDDING
===================================================== */
app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "ALLOWALL");
  res.setHeader("Content-Security-Policy", "frame-ancestors *");
  next();
});

/* =====================================================
   COUNTRY BLOCK (CLOUDFLARE)
===================================================== */
const ALLOWED_COUNTRIES = ["JP"]; // Allow JP + yourself for testing

app.use((req, res, next) => {
  const country = (req.headers["cf-ipcountry"] || "UNKNOWN").toUpperCase();

  if (country === "UNKNOWN") {
    console.log("⚠️ Cloudflare country header missing → allowing request.");
    return next();
  }

  if (!ALLOWED_COUNTRIES.includes(country)) {
    return res.status(403).send("Access blocked by country");
  }

  next();
});

/* =====================================================
   BOT BLOCKING
===================================================== */
const blockedBots = [
  "bot","crawl","spider","slurp","bing","ahrefs","semrush",
  "facebookexternalhit","python-requests","curl","wget",
  "java","headless","node"
];

app.use((req, res, next) => {
  const ua = (req.headers["user-agent"] || "").toLowerCase();
  if (blockedBots.some(b => ua.includes(b))) {
    return res.status(403).send("Bots not allowed");
  }
  next();
});

/* =====================================================
   ACCESS CONTROL
===================================================== */
const ALLOWED_ORIGIN = "https://joynhappy.shop";

app.use((req, res, next) => {

  // Always allow static files
  if (
    req.path.startsWith("/css/") ||
    req.path.startsWith("/js/") ||
    req.path.startsWith("/images/") ||
    req.path.endsWith(".mp4") ||
    req.path === "/" ||
    req.path.endsWith("index.html")
  ) {
    return next();
  }

  // Allow frontend-loader API
  if (req.path === "/frontend-loader") return next();

  const referer = (req.headers.referer || "").toLowerCase();

  // Allow only if request comes from your main site
  if (referer.startsWith(ALLOWED_ORIGIN.toLowerCase())) return next();

  // Block direct access
  if (req.query.loader === "true") {
    return res.status(403).send("Direct loader access blocked");
  }

  return res.status(403).send("Direct access not allowed");
});

/* =====================================================
   FRONTEND LOADER API
===================================================== */
app.get("/frontend-loader", (req, res) => {
  return res.json({ allowed: true });
});

/* =====================================================
   STATIC FILES
===================================================== */
app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* =====================================================
   START SERVER
===================================================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Server running on port " + PORT));









