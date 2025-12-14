import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

/* =====================================================
   BASIC SETUP
===================================================== */
app.use(express.json());

app.use(cors({
  origin: "https://mingletap.shop",
  methods: ["GET", "POST"],
  credentials: true
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =====================================================
   IFRAME ALLOW (CSP ONLY – CORRECT WAY)
===================================================== */
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "frame-ancestors https://mingletap.shop *"
  );
  next();
});

/* =====================================================
   COUNTRY BLOCK (CLOUDFLARE)
===================================================== */
const ALLOWED_COUNTRIES = ["JP"];

app.use((req, res, next) => {
  const country = (req.headers["cf-ipcountry"] || "").toUpperCase();

  // Allow if Cloudflare header missing (local / test)
  if (!country) return next();

  if (!ALLOWED_COUNTRIES.includes(country)) {
    return res.status(403).send("Access blocked by country");
  }

  next();
});

/* =====================================================
   BOT BLOCKING (SAFE LIST)
===================================================== */
const blockedBots = [
  "bot",
  "crawl",
  "spider",
  "slurp",
  "bingpreview",
  "ahrefs",
  "semrush",
  "facebookexternalhit",
  "python-requests",
  "curl",
  "wget",
  "headless"
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
const ALLOWED_ORIGIN = "https://mingletap.shop";

app.use((req, res, next) => {

  // Always allow static assets
  if (
    req.path === "/" ||
    req.path.endsWith(".html") ||
    req.path.endsWith(".css") ||
    req.path.endsWith(".js") ||
    req.path.endsWith(".png") ||
    req.path.endsWith(".jpg") ||
    req.path.endsWith(".svg") ||
    req.path.endsWith(".mp4")
  ) {
    return next();
  }

  // Allow frontend-loader API
  if (req.path === "/frontend-loader") return next();

  const referer = req.headers.referer || "";

  // Allow requests coming from main site
  if (referer.startsWith(ALLOWED_ORIGIN)) return next();

  return res.status(403).send("Direct access not allowed");
});

/* =====================================================
   FRONTEND LOADER API
===================================================== */
app.get("/frontend-loader", (req, res) => {
  res.json({ allowed: true });
});

/* =====================================================
   STATIC FILES
===================================================== */
app.use(express.static(path.join(__dirname, "public")));

/* =====================================================
   SPA FALLBACK
===================================================== */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* =====================================================
   START SERVER
===================================================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
