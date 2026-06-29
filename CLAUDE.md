# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev (runs Express server on :3001 + Vite on :5173 concurrently)
npm run dev

# One-time symbol download from NSE archives → writes src/data/nifty200.json + nifty500.json
npm run fetch-symbols

# Production build (Vite only; server runs as Netlify Functions in prod)
npm run build

# Preview production build locally
npm run preview
```

The `--max-http-header-size=65536` flag in the dev/start scripts is **required** — Yahoo Finance homepage returns oversized response headers that crash Node.js without it.

There is no test suite and no linter configured.

## Architecture

### Runtime split: dev vs production

**Dev:** `concurrently` runs `server/index.js` (Express on port 3001) alongside Vite. The Vite dev server proxies `/api/*` calls to Express.

**Production (Netlify):** `server/index.js` is not used. `netlify.toml` redirects `/api/proxy` and `/api/market-status` to `netlify/functions/proxy.js` and `netlify/functions/market-status.js`. These are CommonJS Netlify Functions (AWS Lambda). The `src/utils/yahooApi.js` frontend code always calls `/api/proxy` as a relative URL — this works in both environments transparently.

### Yahoo Finance authentication

Yahoo Finance requires a crumb token on every API call. The flow:
1. Fetch `https://finance.yahoo.com/` to collect session cookies
2. POST to `/v1/test/getcrumb` using those cookies to get the crumb string
3. Append `&crumb=<value>` to every Yahoo Finance API URL

This state (`yahooCrumb`, `yahooCookies`, `crumbExpiry`) lives at module level in both `server/index.js` and `netlify/functions/proxy.js`. It refreshes every hour or on a 401 response. The Netlify Lambda version reuses module-level state across warm invocations.

### Data flow

```
src/data/nifty200.json   ← NSE CSV archives (fetched by scripts/fetchSymbols.js or /api/refresh-symbols)
src/data/nifty500.json     Each entry: { symbol, yahooSymbol, name, sector, isin, series }

Frontend imports JSON directly → passes yahooSymbol arrays to fetchBulkQuotes()
                              → fetchBulkQuotes() calls /api/proxy → Yahoo Finance v7/quote API
                              → Returns map keyed by yahooSymbol
```

**Symbol format rules (critical):**
- NSE stocks: `RELIANCE` in JSON → `RELIANCE.NS` as Yahoo symbol
- Index symbols starting with `^` (e.g. `^NSEI`, `^CNXAUTO`): must NOT have `.NS` appended
- `fetchBulkQuotes` handles this: `s.endsWith('.NS') || s.startsWith('^') ? s : s + '.NS'`
- `fetchOHLCHistory` and `fetchIntradayCandles` always append `.NS` — do not pass index symbols to these

### State management

Global state via React Context (`src/context/AppContext.jsx`):
- `activeView`: `'stocklist' | 'scanner' | 'heatmap'` — controls which page renders
- `toasts`: array of `{ id, message, type }` — auto-dismissed after 4s
- `marketStatus`: `{ isOpen, session }` — populated by `useMarketStatus` hook

No Redux, no Zustand. Page-level state stays local to each page component.

### Pages and their data hooks

| Page | Component | Hook(s) |
|---|---|---|
| Stock List | `StockList.jsx` | `useStockData(symbols)` — `fetchBulkQuotes`, 60s refresh during market hours |
| Scanner | `Scanner.jsx` | `useScanner()` — sequential batches of 5 stocks, OHLC history + intraday candles per stock |
| Heatmap (Index) | `Heatmap.jsx > IndexHeatmap` | Direct `fetchBulkQuotes` on 18 NSE index symbols, 60s interval |
| Heatmap (Stocks) | `Heatmap.jsx > StockHeatmap` | `useStockData` + `useHeatmap` (groups stocks by `sector` field from JSON) |

### Scanner logic

`useScanner.js` → per stock: fetch 5-day OHLC history + today's 1-minute intraday candles → check `isDoji(yesterdayCandle)` (body < 10% of range) + `isBreakout(currentPrice, 915Candle)` (price > 9:15 AM first candle high).

Signal values: `'STRONG'` (both), `'DOJI ONLY'`, `'BREAKOUT ONLY'`.

Result object fields: `{ symbol, name, sector, currentPrice, changePct, dojiBodyPct, prevDayRange, nifteenHigh, breakoutPct, signal, isDoji, isBreakout }`.

### Sector data in IndexDrawer

`src/components/Heatmap/IndexDrawer.jsx` contains `INDEX_SECTOR_FILTER` — a map from index symbol to a filter function over `nifty500` stocks. Filters use **exact string equality** against `stock.sector`. The full set of sector strings in the JSON is:

`Automobile and Auto Components`, `Capital Goods`, `Chemicals`, `Construction`, `Construction Materials`, `Consumer Durables`, `Consumer Services`, `Diversified`, `Fast Moving Consumer Goods`, `Financial Services`, `Healthcare`, `Information Technology`, `Media Entertainment & Publication`, `Metals & Mining`, `Oil Gas & Consumable Fuels`, `Power`, `Realty`, `Services`, `Telecommunication`, `Textiles`

Always use exact equality (`===`) when filtering by sector — `includes()` on partial strings causes cross-sector contamination (e.g., `'services'` matching `'Financial Services'`).

### CSS design system

Dark theme only. Colors defined as CSS variables in `src/index.css`:
- `--bg-primary: #0A0A0A`, `--bg-secondary: #141414`, `--bg-card: #1C1C1C`
- `--accent: #00D4AA` (teal), `--green: #00C853`, `--red: #FF3D3D`
- `--border: #2A2A2A`

Key CSS animations in `index.css`: `skeleton` (shimmer), `flash-green`/`flash-red` (price change), `ticker-scroll` (auto-scroll IndexTicker), `drawer-enter` (slide-in panel), `settings-enter`.

Tailwind is used for layout/spacing. Component-specific colors are mostly inline or via CSS variables — avoid hardcoding hex colors that duplicate the design system.

### Market hours

`src/utils/marketHours.js` and `server/index.js` both implement IST-based session detection (UTC+5:30). NSE sessions: pre-open 09:00–09:15, open 09:15–15:30, Mon–Fri excluding NSE holidays. Both files have the hardcoded 2025–2026 holiday list — keep them in sync if updating.

`useStockData` only enables auto-refresh when `isMarketOpen()` returns true.

### Netlify deployment

`/api/refresh-symbols` does not exist as a Netlify Function (filesystem is read-only in Lambda). The "Refresh Symbols" button is hidden in production via `import.meta.env.PROD`. Symbol data is baked into the build from `src/data/*.json`.

`netlify/functions/proxy.js` is **CommonJS** (`require`, `exports.handler`) — do not convert to ESM. The main `src/` code is ESM (`"type": "module"` in package.json).

### Dependency note

`date-fns` must stay at `^2.30` (not v3) — `date-fns-tz@^2.0` is incompatible with `date-fns` v3.
