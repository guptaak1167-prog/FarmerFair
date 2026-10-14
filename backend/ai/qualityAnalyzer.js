import { createHash } from "node:crypto";

// Grade -> price multiplier applied to the government reference price (MSP).
const GRADE_BANDS = {
  A: { min: 1.0, max: 1.12, label_en: "Premium (Grade A)", label_hi: "उत्तम (ग्रेड ए)" },
  B: { min: 0.9, max: 1.0, label_en: "Good (Grade B)", label_hi: "अच्छा (ग्रेड बी)" },
  C: { min: 0.75, max: 0.9, label_en: "Fair (Grade C)", label_hi: "सामान्य (ग्रेड सी)" },
};

function heuristicScore(buffer) {
  // Deterministic 0..100 score from image bytes; larger images nudge score up
  // (proxy for clarity/resolution). Purely a placeholder for a real model.
  const hash = createHash("sha256").update(buffer).digest();
  const base = hash[0]; // 0..255
  let score = (base / 255) * 60 + 25; // 25..85 baseline
  const sizeBonus = Math.min(15, buffer.length / 120000); // up to +15 for larger photos
  score += sizeBonus;
  return Math.max(1, Math.min(99, Math.round(score)));
}

function scoreToGrade(score) {
  if (score >= 78) return "A";
  if (score >= 55) return "B";
  return "C";
}

// Extension point for a real vision API. Left unimplemented on purpose so the
// app runs offline; wire it up when you have a model/endpoint.
async function callVisionApi(/* { buffer, mimetype, cropId } */) {
  throw new Error("VISION_API not implemented");
}

export async function analyzeQuality({ buffer, mimetype, cropId }) {
  let score;
  let method;
  if (process.env.VISION_API_URL) {
    try {
      const result = await callVisionApi({ buffer, mimetype, cropId });
      score = result.score;
      method = "vision_api";
    } catch {
      score = heuristicScore(buffer);
      method = "heuristic_fallback";
    }
  } else {
    score = heuristicScore(buffer);
    method = "heuristic";
  }

  const grade = scoreToGrade(score);
  const band = GRADE_BANDS[grade];
  // Position within the band scales with score for a smooth price.
  const within = Math.min(1, Math.max(0, (score % 25) / 25));
  const multiplier = band.min + (band.max - band.min) * within;
  // Confidence is a rough proxy; a real model returns its own probability.
  const confidence = Math.min(0.98, 0.6 + (score / 100) * 0.38);

  return {
    grade,
    score,
    multiplier: Number(multiplier.toFixed(3)),
    confidence: Number(confidence.toFixed(2)),
    label_en: band.label_en,
    label_hi: band.label_hi,
    method,
  };
}
