import express from "express";
import cors from "cors";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import authRouter from "./routes/auth.js";
import pricesRouter from "./routes/prices.js";
import qualityRouter from "./routes/quality.js";
import storageRouter from "./routes/storage.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());

// Health check.
app.get("/api/health", (_req, res) => res.json({ ok: true, service: "farmer-project" }));

// API routes.
app.use("/api/auth", authRouter);
app.use("/api/prices", pricesRouter);
app.use("/api/quality", qualityRouter);
app.use("/api/storage", storageRouter);

// Serve the frontend (static single-page app).
app.use(express.static(join(__dirname, "..", "frontend")));

// Multer / generic error handler.
app.use((err, _req, res, _next) => {
  res.status(400).json({ error: "request_error", message: err.message });
});

app.listen(PORT, () => {
  console.log(`\n  🌾 Farmer Project running:  http://localhost:${PORT}\n`);
});
