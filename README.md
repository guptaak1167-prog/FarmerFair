# 🌾 KisaanFair — Fair Prices for Farmers

A full-stack web app that helps farmers avoid overpaying and under-selling.

## The problems it solves
1. **Buying** — farmers often don't know the government reference (MSP) price, so they overpay.
2. **Selling** — they don't get the fair price their crop's quality deserves.
3. **Quality → price (AI)** — upload a crop photo, get an estimated **quality grade** and the **fair price** for that grade.
4. **No storage** — advice on whether to **sell now or wait**, plus safer storage options (warehouse / warehouse-receipt loan).
5. **Local language** — full **Hindi + English** UI (easy to add more).

## Run it
```bash
cd farmerProject
npm install
npm start
```
Open **http://localhost:3000**

(`npm run dev` auto-restarts on file changes.)

## Tech stack
- **Backend:** Node.js + Express (ES modules)
- **Storage:** simple JSON file store (`backend/data/db.json`) — zero native deps, swap for Postgres/Mongo in production
- **Auth:** phone + password, bcrypt hashing, JWT tokens
- **AI layer:** pluggable crop-quality analyzer (`backend/ai/qualityAnalyzer.js`)
- **Frontend:** vanilla HTML/CSS/JS single-page app, no build step, mobile-first, i18n

## Project structure
```
farmerProject/
├─ backend/
│  ├─ server.js            # Express app, wires routes + serves frontend
│  ├─ db.js                # JSON data store (users, analyses)
│  ├─ ai/qualityAnalyzer.js# AI layer — swap heuristic for a real model
│  ├─ routes/              # auth, prices, quality, storage
│  └─ data/                # msp.json, seasonality.json, db.json (runtime)
└─ frontend/
   ├─ index.html
   ├─ css/styles.css
   └─ js/  app.js, i18n.js
```

## API
| Method | Path | Purpose |
|--------|------|---------|
| GET  | `/api/prices` | List MSP reference prices (`?q=`, `?category=`) |
| GET  | `/api/prices/:id` | One crop |
| POST | `/api/quality` | multipart `image` + `cropId` → grade + fair price (auth optional; saves history if logged in) |
| GET  | `/api/quality/history` | Logged-in user's past checks |
| GET  | `/api/storage/:cropId` | Sell-now vs wait + storage advice |
| POST | `/api/auth/register` | name, phone, password |
| POST | `/api/auth/login` | phone, password |
| GET  | `/api/auth/me` | Current user |

## Making it production-real (where to plug real data/AI)
This app **runs today** with realistic seeded data. To make it authoritative:

1. **Real crop-quality AI** — in `backend/ai/qualityAnalyzer.js`, set `VISION_API_URL` (+ `VISION_API_KEY`) and implement `callVisionApi()`. Point it at Google Cloud Vision, or a custom image model fine-tuned on graded crop photos.
2. **Live prices** — replace `backend/data/msp.json` and the prices route with a live feed. India's mandi price API is on **data.gov.in** (Agmarknet: "Current Daily Price of Various Commodities"); MSP is published by CACP. Register for a data.gov.in API key.
3. **Best-time-to-sell** — `backend/data/seasonality.json` uses reference windows. For accuracy, compute from historical mandi arrivals/prices.
4. **Add languages** — add a block to `frontend/js/i18n.js` and an `<option>` in `index.html`.
5. **Set `JWT_SECRET`** env var in production.

## Important note
Prices are **reference figures for guidance**, not a guaranteed buy/sell rate. Always confirm at your local mandi. The quality grade from the current offline model is a **placeholder**; wire in a real vision model before relying on it.
