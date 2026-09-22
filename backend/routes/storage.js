import { Router } from "express";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const mspData = JSON.parse(readFileSync(join(__dirname, "..", "data", "msp.json"), "utf8"));
const seasonData = JSON.parse(readFileSync(join(__dirname, "..", "data", "seasonality.json"), "utf8"));

const MONTHS_EN = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_HI = ["", "जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];

const router = Router();

// GET /api/storage/:cropId — storage feasibility + best time to sell advice.
router.get("/:cropId", (req, res) => {
  const cropId = req.params.cropId;
  const crop = mspData.crops.find((c) => c.id === cropId);
  const season = seasonData.seasonality[cropId];
  if (!crop || !season) return res.status(404).json({ error: "not_found" });

  const now = new Date().getMonth() + 1; // 1..12
  const isBestNow = season.best_sell_months.includes(now);

  // How many months until the next best-sell window.
  let monthsToBest = 0;
  if (!isBestNow) {
    for (let i = 1; i <= 12; i++) {
      const m = ((now - 1 + i) % 12) + 1;
      if (season.best_sell_months.includes(m)) { monthsToBest = i; break; }
    }
  }

  const canStoreTillBest = season.perishable
    ? false
    : season.storable_months >= monthsToBest;

  const advice = {
    en: [],
    hi: [],
  };

  if (season.perishable) {
    advice.en.push("This crop is perishable — sell soon after harvest; long storage is not advisable.");
    advice.hi.push("यह फसल जल्दी खराब होती है — कटाई के तुरंत बाद बेचें; लंबे समय तक भंडारण उचित नहीं है।");
  } else if (isBestNow) {
    advice.en.push("Prices are usually favourable now — a good time to sell.");
    advice.hi.push("अभी आमतौर पर दाम अच्छे रहते हैं — बेचने का सही समय है।");
  } else if (canStoreTillBest) {
    advice.en.push(`Prices usually rise in about ${monthsToBest} month(s). If you can store safely, waiting may fetch a better price.`);
    advice.hi.push(`दाम आमतौर पर लगभग ${monthsToBest} महीने में बढ़ते हैं। यदि सुरक्षित भंडारण संभव हो तो रुककर बेचने से बेहतर दाम मिल सकते हैं।`);
    advice.en.push("No storage? Consider a nearby warehouse / WDRA-registered godown or a warehouse-receipt loan to avoid a distress sale.");
    advice.hi.push("भंडारण नहीं है? नजदीकी गोदाम / WDRA-पंजीकृत वेयरहाउस या वेयरहाउस-रसीद ऋण का उपयोग करें ताकि कम दाम में मजबूरी में न बेचना पड़े।");
  } else {
    advice.en.push("Safe storage window is shorter than the wait to the best price — selling near harvest is reasonable.");
    advice.hi.push("सुरक्षित भंडारण की अवधि, बेहतर दाम तक इंतज़ार से कम है — कटाई के आसपास बेचना ठीक रहेगा।");
  }

  res.json({
    crop: { id: crop.id, name_en: crop.name_en, name_hi: crop.name_hi, msp: crop.msp },
    currentMonth: { num: now, en: MONTHS_EN[now], hi: MONTHS_HI[now] },
    isBestToSellNow: isBestNow,
    monthsToBestWindow: monthsToBest,
    bestSellMonths: {
      en: season.best_sell_months.map((m) => MONTHS_EN[m]),
      hi: season.best_sell_months.map((m) => MONTHS_HI[m]),
    },
    harvestMonths: {
      en: season.harvest_months.map((m) => MONTHS_EN[m]),
      hi: season.harvest_months.map((m) => MONTHS_HI[m]),
    },
    perishable: season.perishable,
    safeStorageMonths: season.storable_months,
    canStoreTillBest,
    advice,
  });
});

export default router;
