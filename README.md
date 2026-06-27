# NSE Dashboard

Production-ready Indian stock market dashboard — live prices, Doji+breakout scanner, sector heatmap.

## Stack
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Express.js (CORS proxy + symbol refresh)
- **Data**: Yahoo Finance (free, via server proxy) + NSE CSV archives

## Setup

```bash
git clone <repo>
cd stock-dashboard
npm install
npm run fetch-symbols     # downloads live Nifty 200 + 500 lists from NSE
npm run dev               # starts Express (port 3001) + Vite (port 5173)
```

Open http://localhost:5173

## Features

### Stock List
- Nifty 200 / Nifty 500 tabs
- Live prices with auto-refresh every 60s during market hours
- Search, sort, and filter (Gainers / Losers / Unchanged)
- Click any row for a detail panel
- Indian number formatting (₹1,23,456.78), volume in K/L/Cr
- Price flash animation on updates

### Scanner
- Detects **Previous Day Doji** (body < 10% of total range)
- Detects **9:15 AM High Breakout** (price > first candle high)
- Progress bar with cancel, batch size 5 with 500ms delay
- Results sorted by breakout %, signal badges: STRONG / DOJI ONLY / BREAKOUT ONLY

### Sector Heatmap
- All sectors derived dynamically from nifty500.json
- Color scale: dark red (<-3%) → dark green (>+3%)
- Click sector for full stock table sorted by change%

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/market-status` | IST session status, next open/close |
| `GET /api/proxy?url=...` | Yahoo Finance CORS proxy (30s cache) |
| `POST /api/refresh-symbols` | Re-downloads NSE CSVs, returns counts |

## Notes

- Yahoo Finance requires a crumb token — the server fetches and caches it automatically on startup
- NSE symbol CSVs are refreshed via the "Refresh Symbols" button in the header
- Market hours: Mon–Fri 09:15–15:30 IST (NSE 2025–2026 holidays excluded)
