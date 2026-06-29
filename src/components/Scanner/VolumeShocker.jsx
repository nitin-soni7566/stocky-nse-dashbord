import { useState } from 'react'
import { useVolumeShocker } from '../../hooks/useVolumeShocker.js'
import { ScanProgress } from './ScanProgress.jsx'
import { VolumeHeatmap } from './VolumeHeatmap.jsx'
import { formatVolume, formatINR } from '../../utils/formatters.js'
import { ChangePill } from '../UI/ChangePill.jsx'
import nifty200 from '../../data/nifty200.json'
import nifty500 from '../../data/nifty500.json'
import niftyFO from '../../data/niftyFO.json'

const INDICES = { 'Nifty 200': nifty200, 'Nifty 500': nifty500 }
if (niftyFO.length > 0) INDICES['F&O'] = niftyFO

const THRESHOLD_OPTIONS = [
  { value: 1.5, label: '1.5x+' },
  { value: 2, label: '2x+' },
  { value: 3, label: '3x+' },
  { value: 5, label: '5x+' },
]

export function VolumeShocker() {
  const [selectedIndex, setSelectedIndex] = useState('Nifty 200')
  const [threshold, setThreshold] = useState(2)
  const [infoOpen, setInfoOpen] = useState(false)
  const { results, scanning, progress, timeRemaining, runScan, cancel } = useVolumeShocker()

  const handleRun = () => {
    const symbols = INDICES[selectedIndex]
    runScan(symbols, threshold)
  }

  return (
    <div className="flex flex-col gap-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 md:p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Volume Shocker</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">Stocks with unusual volume vs 20-day average</p>
        </div>
        <button
          onClick={() => setInfoOpen(o => !o)}
          className="text-xs text-[var(--accent)] hover:underline flex-shrink-0"
        >
          {infoOpen ? 'Hide' : 'How it works'} ▾
        </button>
      </div>

      {infoOpen && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4 text-xs text-[var(--text-secondary)] space-y-2 border border-[var(--border)]">
          <p><strong className="text-[var(--text-primary)]">Volume Ratio:</strong> Today's traded volume divided by the 20-day average volume. A ratio of 3x means today has 3× more trading activity than usual.</p>
          <p><strong className="text-[var(--text-primary)]">Why it matters:</strong> Unusual volume often precedes significant price moves — either continuation or reversal. It signals that institutions or large traders are active in the stock.</p>
          <p className="text-[var(--text-muted)]">Note: Scan takes 2–5 minutes depending on the index size. Data is fetched from Yahoo Finance daily OHLC.</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-end">
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">Index</label>
          <div className="flex gap-2 flex-wrap">
            {Object.keys(INDICES).map(idx => (
              <button
                key={idx}
                onClick={() => setSelectedIndex(idx)}
                className={`px-4 py-2 rounded text-sm font-medium border transition-colors
                  ${selectedIndex === idx
                    ? 'border-[var(--accent)] text-[var(--accent)] bg-teal-900/20'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]'
                  }`}
              >
                {idx}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">Min Volume Ratio</label>
          <div className="flex gap-2">
            {THRESHOLD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setThreshold(opt.value)}
                className={`px-3 py-2 rounded text-sm font-medium border transition-colors
                  ${threshold === opt.value
                    ? 'border-sky-500 text-sky-400 bg-sky-900/20'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleRun}
          disabled={scanning}
          className="px-8 py-3 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {scanning ? 'Scanning...' : '⚡ Run Volume Scan'}
        </button>
      </div>

      {scanning && (
        <ScanProgress progress={progress} timeRemaining={timeRemaining} onCancel={cancel} />
      )}

      {!scanning && results.length > 0 && (
        <>
          <div className="text-sm text-[var(--text-secondary)]">
            Found <span className="text-[var(--text-primary)] font-semibold">{results.length}</span> stocks with volume ≥ {threshold}x average
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--bg-card)]">
                <tr className="border-b border-[var(--border)]">
                  {['#', 'Symbol', 'Company', 'Sector', 'Price', 'Chg%', 'Today Vol', 'Avg Vol (20d)', 'Ratio'].map(h => (
                    <th key={h} className="px-2 py-2 text-left text-[var(--text-muted)] uppercase tracking-wider font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((s, i) => (
                  <tr key={s.symbol} className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)]">
                    <td className="px-2 py-2 text-[var(--text-muted)]">{i + 1}</td>
                    <td className="px-2 py-2 font-mono font-semibold text-[var(--accent)]">{s.symbol}</td>
                    <td className="px-2 py-2 text-[var(--text-secondary)] max-w-[140px] truncate">{s.name}</td>
                    <td className="px-2 py-2 text-[var(--text-muted)] max-w-[120px] truncate">{s.sector}</td>
                    <td className="px-2 py-2 font-mono text-[var(--text-primary)]">{s.price != null ? formatINR(s.price) : '—'}</td>
                    <td className="px-2 py-2"><ChangePill value={s.changePct} /></td>
                    <td className="px-2 py-2 font-mono text-sky-400 font-semibold">{formatVolume(s.todayVolume)}</td>
                    <td className="px-2 py-2 font-mono text-[var(--text-secondary)]">{formatVolume(s.avgVolume)}</td>
                    <td className="px-2 py-2">
                      <span
                        className="font-mono font-bold text-sm px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: s.volumeRatio >= 5 ? '#3b0764' : s.volumeRatio >= 3 ? '#1e1b4b' : '#0c1a2e',
                          color: s.volumeRatio >= 5 ? '#c084fc' : s.volumeRatio >= 3 ? '#818cf8' : '#60a5fa'
                        }}
                      >
                        {s.volumeRatio.toFixed(1)}x
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <VolumeHeatmap results={results} />
        </>
      )}

      {!scanning && results.length === 0 && progress.total > 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
          <div className="text-4xl mb-3">📭</div>
          <p>No stocks found with volume ≥ {threshold}x average. Try a lower threshold.</p>
        </div>
      )}
    </div>
  )
}
