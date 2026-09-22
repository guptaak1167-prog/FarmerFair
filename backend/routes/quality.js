import { Router } from "express";
import multer from "multer";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { analyzeQuality } from "../ai/qualityAnalyzer.js";
import { db } from "../db.js";
import { requireAuth } from "./auth.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const mspData = JSON.parse(readFileSync(join(__dirname, "..", "data", "msp.json"), "utf8"));

const router = Router();

// Keep uploads in memory: we analyze bytes, we don't need to persist the photo.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error("only image files are allowed"));
  },
});

// POST /api/quality  (multipart/form-data: image=<file>, cropId=<id>)
// Optional auth: if a token is present the result is saved to history.
router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "no_image", message: "attach an image file field named 'image'" });
    const cropId = (req.body.cropId || "").toString();
    const crop = mspData.crops.find((c) => c.id === cropId);
    if (!crop) return res.status(400).json({ error: "invalid_crop", message: "provide a valid cropId (see /api/prices)" });

    const analysis = await analyzeQuality({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      cropId,
    });

    const fairPrice = Math.round(crop.msp * analysis.multiplier);
    const result = {
      crop: { id: crop.id, name_en: crop.name_en, name_hi: crop.name_hi },
      msp: crop.msp,
      unit: mspData.meta.unit,
      grade: analysis.grade,
      grade_label_en: analysis.label_en,
      grade_label_hi: analysis.label_hi,
      qualityScore: analysis.score,
      confidence: analysis.confidence,
      fairPrice,
      priceVsMsp: fairPrice - crop.msp,
      method: analysis.method,
      createdAt: new Date().toISOString(),
    };

    // Save to history if the request is authenticated.
    const header = req.headers.authorization || "";
    if (header.startsWith("Bearer ")) {
      try {
        requireAuth(req, res, () => {});
        if (req.user) db.addAnalysis({ id: randomUUID(), userId: req.user.id, ...result });
      } catch { /* ignore — anonymous analysis is allowed */ }
    }

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: "analysis_failed", message: err.message });
  }
});

// GET /api/quality/history — past analyses for the logged-in user.
router.get("/history", requireAuth, (req, res) => {
  res.json({ analyses: db.listAnalysesByUser(req.user.id) });
});

export default router;
