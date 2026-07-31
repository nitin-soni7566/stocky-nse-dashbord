import { useState, useMemo, useCallback, useEffect } from 'react'
import { useScanner, DEFAULT_SCAN_OPTIONS } from '../../hooks/useScanner.js'
import { useGainersLosers } from '../../hooks/useGainersLosers.js'
import { useStockData } from '../../hooks/useStockData.js'
import { useDebouncedValue } from '../../hooks/useDebounce.js'
import { ScanProgress } from './ScanProgress.jsx'
import { ScannerResults } from './ScannerResults.jsx'
import { ScanHeatmap } from './ScanHeatmap.jsx'
import { VolumeShocker } from './VolumeShocker.jsx'
import { ErrorBoundary } from '../UI/ErrorBoundary.jsx'
import { useApp } from '../../context/AppContext.jsx'
import niftyFO from '../../data/niftyFO.json'

const TABS = ['Gainers', 'Losers', 'F&O']

const emptyLiveFilters = { priceMin: '', priceMax: '', volumeMin: '', changeMin: '', changeMax: '' }

function passesLiveFilters(quote, f) {
  if (!quote) return false
  if (f.priceMin !== '' && (quote.price == null || quote.price < +f.priceMin)) return false
  if (f.priceMax !== '' && (quote.price == null || quote.price > +f.priceMax)) return false
  if (f.volumeMin !== '' && (quote.volume == null || quote.volume < +f.volumeMin)) return false
  if (f.changeMin !== '' && (quote.changePct == null || quote.changePct < +f.changeMin)) return false
  if (f.changeMax !== '' && (quote.changePct == null || quote.changePct > +f.changeMax)) return false
  return true
}

function FilterCheckbox({ checked, onChange, label, children }) {
  return (
    <div className="flex flex-col gap-2 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border)] p-3">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={checked} onChange={onChange} className="accent-[var(--accent)] w-4 h-4" />
        <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
      </label>
      {checked && children && <div className="pl-6 flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

function NumInput({ value, onChange, placeholder, width = 70 }) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width }}
      className="bg-[var(--bg-card)] border border-[var(--border)] rounded px-2 py-1 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
    />
  )
}

export function Scanner() {
  const [tab, setTab] = useState('Gainers')
  const [liveFilters, setLiveFilters] = useState(emptyLiveFilters)
  const [options, setOptions] = useState(DEFAULT_SCAN_OPTIONS)
  const [infoOpen, setInfoOpen] = useState(false)
  const { dispatch } = useApp()
  const openDetail = symbol => dispatch({ type: 'OPEN_STOCK_DETAIL', payload: symbol })

  const { gainers, losers, quotes: rankQuotes, dataSource } = useGainersLosers()
  const { quotes: foQuotes } = useStockData(niftyFO)
  const { results: scanResults, scanning, progress, timeRemaining, runScan, cancel } = useScanner()

  // Doji isn't offered for F&O — force it off if the user had it on from
  // another tab so it doesn't silently stay active as a hidden filter.
  useEffect(() => {
    if (tab === 'F&O' && options.doji) setOptions(o => ({ ...o, doji: false }))
  }, [tab])

  const debouncedLive = useDebouncedValue(liveFilters, 250)

  const universe = tab === 'Gainers' ? gainers : tab === 'Losers' ? losers : niftyFO
  const quotesForTab = tab === 'F&O' ? foQuotes : rankQuotes

  const anyIndicatorFilter = options.doji || options.breakout || options.rsi || options.ema || options.sma || options.vwap || options.gap
  const anyLiveFilterSet = Object.values(debouncedLive).some(v => v !== '')

  // Real-time: universe rows re-filtered on every quote tick, no scan needed.
  const liveRows = useMemo(() => {
    return universe
      .map(s => ({ ...s, quote: s.quote ?? quotesForTab[s.yahooSymbol] ?? null }))
      .filter(s => passesLiveFilters(s.quote, debouncedLive))
      .map(s => ({
        symbol: s.symbol, name: s.name, sector: s.sector,
        currentPrice: s.quote?.price ?? null,
        changePct: s.quote?.changePct ?? null,
        volume: s.quote?.volume ?? null,
        signal: null
      }))
      .sort((a, b) => (b.changePct ?? -999) - (a.changePct ?? -999))
  }, [universe, quotesForTab, debouncedLive])

  // Indicator scan results, kept live by re-joining against the current quotes
  // map and re-applying the live filters (so a stock that drifts out of range
  // as ticks arrive disappears without a manual re-scan).
  const liveScanRows = useMemo(() => {
    if (!scanResults.length) return []
    const yahooBySymbol = new Map(universe.map(s => [s.symbol, s.yahooSymbol]))
    return scanResults
      .map(r => {
        const q = quotesForTab[yahooBySymbol.get(r.symbol)]
        return q ? { ...r, currentPrice: q.price ?? r.currentPrice, changePct: q.changePct ?? r.changePct, volume: q.volume ?? r.volume } : r
      })
      .filter(r => passesLiveFilters({ price: r.currentPrice, volume: r.volume, changePct: r.changePct }, debouncedLive))
  }, [scanResults, quotesForTab, universe, debouncedLive])

  const displayRows = anyIndicatorFilter ? liveScanRows : liveRows
  const showScanUi = anyIndicatorFilter

  const handleRun = useCallback(() => {
    const symbols = anyLiveFilterSet
      ? universe.filter(s => passesLiveFilters(s.quote ?? quotesForTab[s.yahooSymbol], debouncedLive))
      : universe
    runScan(symbols, options)
  }, [universe, quotesForTab, debouncedLive, anyLiveFilterSet, options, runScan])

  const toggleOption = key => setOptions(o => ({ ...o, [key]: !o[key] }))
  const setOption = (key, val) => setOptions(o => ({ ...o, [key]: val }))
  const setLiveFilter = (key, val) => setLiveFilters(f => ({ ...f, [key]: val }))

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full p-3 md:p-6 gap-4 md:gap-6 overflow-auto">
        <div className="flex flex-col gap-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 md:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Stock Scanner</h2>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Live filters update instantly · pattern/indicator filters need a scan
              </p>
            </div>
            <button onClick={() => setInfoOpen(o => !o)} className="text-xs text-[var(--accent)] hover:underline flex-shrink-0">
              {infoOpen ? 'Hide' : 'How it works'} ▾
            </button>
          </div>

          {infoOpen && (
            <div className="bg-[var(--bg-secondary)] rounded-lg p-4 text-xs text-[var(--text-secondary)] space-y-2 border border-[var(--border)]">
              <p><strong className="text-[var(--text-primary)]">Live filters</strong> (Price/Volume/Change%) react to every price tick — no scan needed.</p>
              <p><strong className="text-[var(--text-primary)]">Pattern &amp; indicator filters</strong> (Doji, Breakout, RSI, EMA, SMA, VWAP, Gap) need historical candles, so they run as a batched scan. Combine both: live filters narrow the universe before the scan runs, for speed.</p>
            </div>
          )}

          {/* Universe tabs */}
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">Universe</label>
            <div className="flex gap-2">
              {TABS.map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded text-sm font-medium border transition-colors
                    ${tab === t ? 'border-[var(--accent)] text-[var(--accent)] bg-teal-900/20' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]'}`}
                >
                  {t === 'Gainers' ? '📈 Top Gainers' : t === 'Losers' ? '📉 Top Losers' : '⚙️ F&O'}
                </button>
              ))}
              <span className="ml-2 self-center text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border)]">
                {dataSource === 'upstox-live' ? '🟢 live' : '🔄 polling'}
              </span>
            </div>
          </div>

          {/* Live filters */}
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">Live Filters</label>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[var(--text-muted)]">Price</span>
                <NumInput value={liveFilters.priceMin} onChange={v => setLiveFilter('priceMin', v)} placeholder="min" />
                <span className="text-[var(--text-muted)]">–</span>
                <NumInput value={liveFilters.priceMax} onChange={v => setLiveFilter('priceMax', v)} placeholder="max" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[var(--text-muted)]">Volume ≥</span>
                <NumInput value={liveFilters.volumeMin} onChange={v => setLiveFilter('volumeMin', v)} placeholder="min" width={90} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[var(--text-muted)]">Chg%</span>
                <NumInput value={liveFilters.changeMin} onChange={v => setLiveFilter('changeMin', v)} placeholder="min" />
                <span className="text-[var(--text-muted)]">–</span>
                <NumInput value={liveFilters.changeMax} onChange={v => setLiveFilter('changeMax', v)} placeholder="max" />
              </div>
              {anyLiveFilterSet && (
                <button onClick={() => setLiveFilters(emptyLiveFilters)} className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)]">Clear</button>
              )}
            </div>
          </div>

          {/* Pattern & indicator filters */}
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">Patterns &amp; Indicators</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {tab !== 'F&O' && (
                <FilterCheckbox checked={options.doji} onChange={() => toggleOption('doji')} label="Previous Day Doji" />
              )}

              <FilterCheckbox checked={options.breakout} onChange={() => toggleOption('breakout')} label="High Breakout">
                <input type="time" value={options.breakoutTime} min="09:15" max="15:25" step="60"
                  onChange={e => setOption('breakoutTime', e.target.value)}
                  className="bg-[var(--bg-card)] border border-[var(--border)] rounded px-2 py-1 text-xs font-mono text-[var(--text-primary)] w-24" />
              </FilterCheckbox>

              <FilterCheckbox checked={options.rsi} onChange={() => toggleOption('rsi')} label="RSI">
                <NumInput value={options.rsiMin ?? ''} onChange={v => setOption('rsiMin', v === '' ? null : +v)} placeholder="min" width={50} />
                <span className="text-[var(--text-muted)]">–</span>
                <NumInput value={options.rsiMax ?? ''} onChange={v => setOption('rsiMax', v === '' ? null : +v)} placeholder="max" width={50} />
              </FilterCheckbox>

              <FilterCheckbox checked={options.ema} onChange={() => toggleOption('ema')} label="EMA">
                <NumInput value={options.emaPeriod} onChange={v => setOption('emaPeriod', +v || 20)} placeholder="period" width={55} />
                <select value={options.emaCondition} onChange={e => setOption('emaCondition', e.target.value)}
                  className="bg-[var(--bg-card)] border border-[var(--border)] rounded px-1.5 py-1 text-xs text-[var(--text-primary)]">
                  <option value="above">Price above</option>
                  <option value="below">Price below</option>
                </select>
              </FilterCheckbox>

              <FilterCheckbox checked={options.sma} onChange={() => toggleOption('sma')} label="SMA">
                <NumInput value={options.smaPeriod} onChange={v => setOption('smaPeriod', +v || 20)} placeholder="period" width={55} />
                <select value={options.smaCondition} onChange={e => setOption('smaCondition', e.target.value)}
                  className="bg-[var(--bg-card)] border border-[var(--border)] rounded px-1.5 py-1 text-xs text-[var(--text-primary)]">
                  <option value="above">Price above</option>
                  <option value="below">Price below</option>
                </select>
              </FilterCheckbox>

              <FilterCheckbox checked={options.vwap} onChange={() => toggleOption('vwap')} label="VWAP">
                <select value={options.vwapCondition} onChange={e => setOption('vwapCondition', e.target.value)}
                  className="bg-[var(--bg-card)] border border-[var(--border)] rounded px-1.5 py-1 text-xs text-[var(--text-primary)]">
                  <option value="above">Price above</option>
                  <option value="below">Price below</option>
                </select>
              </FilterCheckbox>

              <FilterCheckbox checked={options.gap} onChange={() => toggleOption('gap')} label="Gap Up / Down">
                <select value={options.gapDirection} onChange={e => setOption('gapDirection', e.target.value)}
                  className="bg-[var(--bg-card)] border border-[var(--border)] rounded px-1.5 py-1 text-xs text-[var(--text-primary)]">
                  <option value="up">Gap Up ≥</option>
                  <option value="down">Gap Down ≥</option>
                </select>
                <NumInput value={options.gapThreshold} onChange={v => setOption('gapThreshold', +v || 0)} placeholder="%" width={50} />
              </FilterCheckbox>
            </div>
          </div>

          {anyIndicatorFilter && (
            <button
              onClick={handleRun}
              disabled={scanning}
              className="self-start px-8 py-3 bg-[var(--accent)] text-black font-bold rounded-lg hover:bg-[var(--accent-dim)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {scanning ? 'Scanning...' : `▶ Run Scan (${universe.length} stocks)`}
            </button>
          )}
        </div>

        {scanning && <ScanProgress progress={progress} timeRemaining={timeRemaining} onCancel={cancel} />}

        {!scanning && (
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 flex flex-col">
            {!showScanUi && (
              <div className="mb-2 text-xs text-[var(--text-muted)]">
                Showing live {tab} {anyLiveFilterSet ? '(filtered)' : ''} — updates automatically, no scan needed.
              </div>
            )}
            <ScannerResults results={displayRows} onSelect={r => openDetail(r.symbol)} />
            {displayRows.length > 0 && <ScanHeatmap scannedStocks={displayRows} />}
          </div>
        )}

        <VolumeShocker />
      </div>
    </ErrorBoundary>
  )
}
