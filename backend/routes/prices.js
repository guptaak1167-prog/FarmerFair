import { Router } from "express";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const mspData = JSON.parse(readFileSync(join(__dirname, "..", "data", "msp.json"), "utf8"));

const router = Router();

// GET /api/prices — list all reference (government MSP) prices.
// Optional ?q= to search, ?category= to filter.
router.get("/", (req, res) => {
  const q = (req.query.q || "").toString().toLowerCase().trim();
  const category = (req.query.category || "").toString().toLowerCase().trim();
  let crops = mspData.crops;
  if (category) crops = crops.filter((c) => c.category === category);
  if (q) {
    crops = crops.filter(
      (c) => c.name_en.toLowerCase().includes(q) || c.name_hi.includes(q) || c.id.includes(q)
    );
  }
  res.json({ meta: mspData.meta, count: crops.length, crops });
});

// GET /api/prices/:id — single crop reference price.
router.get("/:id", (req, res) => {
  const crop = mspData.crops.find((c) => c.id === req.params.id);
  if (!crop) return res.status(404).json({ error: "not_found" });
  res.json({ meta: mspData.meta, crop });
});

export default router;
