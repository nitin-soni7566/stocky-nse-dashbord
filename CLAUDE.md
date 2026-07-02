# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev (runs Express server on :3001 + Vite on :5173 concurrently)
npm run dev

# One-time symbol download → writes src/data/nifty200.json + nifty500.json (NSE archives)
# and niftyFO.json (F&O-eligible stocks, from Dhan scrip master CSV)
npm run fetch-symbols

# Production build (Vite only; server runs as Netlify Functions in prod)
npm run build

# Preview production build locally
npm run preview
```

The dev server needs `UPSTOX_ACCESS_TOKEN` in `.env` (a long-lived Upstox access token). Without it, market data is unavailable. `.env` is gitignored; on Netlify set the same var in the site's environment. The `--max-http-header-size=65536` flag in the dev script is legacy (from the former Yahoo integration) and harmless.

There is no test suite and no linter configured.

## Architecture

### Runtime split: dev vs production

**Dev:** `concurrently` runs `server/index.js` (Express on port 3001) alongside Vite. The Vite dev server proxies `/api/*` calls to Express.

**Production (Netlify):** `server/index.js` is not used. `netlify.toml` redirects `/api/upstox/*` → `netlify/functions/upstox.js` and `/api/market-status` → `netlify/functions/market-status.js` (CommonJS Lambdas). The frontend always calls relative `/api/upstox/...` URLs, so `src/utils/upstoxApi.js` is environment-agnostic. **Netlify cannot hold a persistent WebSocket** — its `upstox.js` function only does the REST proxy and reports `streaming:false`, so the client falls back to polling there.

### Upstox data source (sole provider)

All market data comes from Upstox. Yahoo and Dhan have been removed. The **access token never reaches the browser** — every Upstox call is proxied server-side with an injected `Authorization: Bearer` header.

**Instrument keys** (Upstox's symbol identifiers), built in `src/utils/instruments.js`:
- Equities: `NSE_EQ|<ISIN>` — the ISIN comes from the JSON data (`s.isin`).
- Indices: `NSE_INDEX|<name>` (e.g. `^NSEI` → `NSE_INDEX|Nifty 50`) via the hardcoded, live-verified `INDEX_KEY_MAP`. Indices have no ISIN, so they MUST go through this map.
- `toInstrumentKey(symbol)` / `fromInstrumentKey(key)` convert both directions. Upstox quote responses are keyed by `NSE_EQ:RELIANCE` but include `instrument_token` (= the key) — use that to reverse-map back to our symbols.

**Server proxy & streaming** (`server/upstox.js`, mounted by `server/index.js`):
- `GET /api/upstox/rest/<upstox-path>` — allowlisted REST passthrough (`/v2/market-quote/`, `/v3/historical-candle/` only) with a 1.5s TTL cache. Forwards `req.originalUrl` verbatim so client-side percent-encoding is preserved.
- `GET /api/upstox/status` — `{ configured, streaming }`.
- `POST /api/upstox/subscribe` `{ keys }` + `GET /api/upstox/stream` (SSE) — one shared upstream Upstox WebSocket (protobuf, decoded via `server/proto/MarketDataFeedV3.proto` + `protobufjs`) fans ticks out to all browser SSE clients. Auto-reconnects with backoff; disconnects when no clients remain.

Tick fields extracted from protobuf `FeedResponse.feeds[key]`: `ltp` (price), `cp` (prevClose), `vtt` (today's volume, equities only), and the `interval==='1d'` OHLC entry (open/high/low). Derived: `change = ltp - cp`, `changePct = change / cp * 100`.

### Data flow

```
src/data/nifty200.json   ← NSE CSV archives (fetched by scripts/fetchSymbols.js or /api/refresh-symbols)
src/data/nifty500.json     Each entry: { symbol, yahooSymbol, name, sector, isin, series }
src/data/niftyFO.json    ← Dhan scrip master CSV (F&O-eligible stocks). Loaded by Scanner;
                           the "F&O" index tab appears only when this file is non-empty.

Frontend imports JSON → symbol arrays → instruments.js maps to Upstox keys →
  quotes:  fetchBulkQuotes()   → /api/upstox/rest/v2/market-quote/quotes (batches of 500)
  live:    subscribeQuotes()   → SSE /api/upstox/stream  (dev only)
  history: fetchOHLCHistory()  → /v3/historical-candle/... (+ today appended from a live quote)
  intraday:fetchIntradayCandles() → /v3/historical-candle/intraday/...
All return maps/arrays keyed by our symbols (yahooSymbol or ^index) — downstream code unchanged.
```

**Symbol / instrument-key rules (critical):**
- The JSON still uses `yahooSymbol` (`RELIANCE.NS`) as the canonical key throughout the UI — this field name is retained for continuity; it is NOT sent to Yahoo.
- Index symbols starting with `^` resolve ONLY via `INDEX_KEY_MAP`; equities resolve via ISIN. `toInstrumentKey` handles both.
- `fetchOHLCHistory`/`fetchIntradayCandles` accept equity symbols; do not pass `^` index symbols (no historical-candle endpoint for indices).
- Upstox `/v2/market-quote/quotes` accepts at most **500** instrument keys per request — `fetchBulkQuotes` batches accordingly.
- Upstox candle arrays are `[isoTs(+05:30), o, h, l, c, volume, oi]`, **newest-first** — the API helpers reverse them to oldest→newest. Historical excludes today, so `fetchOHLCHistory` appends a synthesized "today" candle from a live quote (needed for scanner `history[len-1]` and volume-shocker today-volume).

### State management

Global state via React Context (`src/context/AppContext.jsx`):
- `activeView`: `'stocklist' | 'scanner' | 'heatmap'` — controls which page renders
- `toasts`: array of `{ id, message, type }` — auto-dismissed after 4s
- `marketStatus`: `{ isOpen, session }` — populated by `useMarketStatus` hook

No Redux, no Zustand. Page-level state stays local to each page component.

### Pages and their data hooks

| Page | Component | Hook(s) |
|---|---|---|
| Stock List | `StockList.jsx` | `useStockData(symbols)` — initial `fetchBulkQuotes` snapshot, then live SSE via `subscribeQuotes` (dev) or 2s REST polling (prod/no-stream); `dataSource` = `'upstox-live'` \| `'upstox-poll'` |
| Scanner | `Scanner.jsx` | `useScanner()` — Doji/breakout, sequential batches of 5, OHLC history + intraday candles per stock. Also renders `<VolumeShocker>` (below) at the bottom. |
| Volume Shocker | `Scanner/VolumeShocker.jsx` | `useVolumeShocker()` — batches of 5, 22-day OHLC per stock, flags today's volume ≥ N× trailing average |
| Heatmap (Index) | `Heatmap.jsx > IndexHeatmap` | Direct `fetchBulkQuotes` on 17 NSE index symbols (resolved via `INDEX_KEY_MAP`), 60s interval |
| Heatmap (Stocks) | `Heatmap.jsx > StockHeatmap` | `useStockData` + `useHeatmap` (groups stocks by `sector` field from JSON) |

### Scanner logic

`useScanner.js` `runScan(symbols, options)` where `options = { doji, breakout, breakoutTime }`. Per stock: fetch 5-day OHLC history + today's 1-minute intraday candles → check `isDoji(yesterdayCandle)` (body < 10% of range) + `isBreakout(currentPrice, breakoutCandle)` (price > the high of the candle at `breakoutTime`).

`breakoutTime` is user-configurable (default `'09:15'`, range 09:15–15:25) via `get915Candle(candles, istTime)` — it is not hardcoded to the market open. OHLC and intraday fetches are skipped when the corresponding option is off.

Signal values: `'STRONG'` (both), `'DOJI ONLY'`, `'BREAKOUT ONLY'`.

Result object fields: `{ symbol, name, sector, currentPrice, changePct, dojiBodyPct, prevDayRange, nifteenHigh, breakoutPct, signal, isDoji, isBreakout }`. Results are sorted by `breakoutPct` descending.

### Volume Shocker logic

`useVolumeShocker.js` `runScan(symbols, threshold = 2)` → per stock: fetch 22-day OHLC, compute the trailing average volume over prior days (needs ≥ 5 valid days), flag when `today.volume / avgVolume >= threshold`. Batches of 5 with a 400ms inter-batch delay; results sorted by `volumeRatio` descending. Both this hook and `useScanner` expose the same shape (`results, scanning, progress, timeRemaining, runScan, cancel`) with a `cancelRef` for mid-scan cancellation.

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

`netlify/functions/upstox.js` and `market-status.js` are **CommonJS** (`require`, `exports.handler`) — do not convert to ESM. The main `src/` code is ESM (`"type": "module"` in package.json). `netlify/functions/upstox.js` handles both `/api/upstox/status` (reports `streaming:false`) and `/api/upstox/rest/*` (REST passthrough); the SSE `/stream` + `/subscribe` routes exist only on the Express dev server. Set `UPSTOX_ACCESS_TOKEN` in the Netlify site env.

### Dependency note

`date-fns` must stay at `^2.30` (not v3) — `date-fns-tz@^2.0` is incompatible with `date-fns` v3.

`ws` + `protobufjs` power the server-side Upstox WebSocket relay. The proto schema lives at `server/proto/MarketDataFeedV3.proto` (fetched from `https://assets.upstox.com/feed/market-data-feed/v3/MarketDataFeed.proto`); re-download it if Upstox changes the feed format.
