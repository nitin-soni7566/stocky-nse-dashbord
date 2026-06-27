import { useState } from 'react'
import { useScanner } from '../../hooks/useScanner.js'
import { ScanProgress } from './ScanProgress.jsx'
import { ScannerResults } from './ScannerResults.jsx'
import { ErrorBoundary } from '../UI/ErrorBoundary.jsx'
import nifty200 from '../../data/nifty200.json'
import nifty500 from '../../data/nifty500.json'

const INDICES = { 'Nifty 200': nifty200, 'Nifty 500': nifty500 }

export function Scanner() {
  const [selectedIndex, setSelectedIndex] = useState('Nifty 200')
  const [options, setOptions] = useState({ doji: true, breakout: true })
  const [infoOpen, setInfoOpen] = useState(false)
  const { results, scanning, progress, timeRemaining, runScan, cancel } = useScanner()

  const handleRun = () => {
    const symbols = INDICES[selectedIndex]
    runScan(symbols, options)
  }

  const toggleOption = key => setOptions(o => ({ ...o, [key]: !o[key] }))

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full p-3 md:p-6 gap-4 md:gap-6 overflow-auto">
        <div className="flex flex-col gap-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 md:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Stock Scanner</h2>
              <p className="text-sm text-[var(--text-muted)] mt-1">Find Doji + 9:15 AM breakout setups</p>
            </div>
            <button
              onClick={() => setInfoOpen(o => !o)}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              {infoOpen ? 'Hide' : 'How it works'} ▾
            </button>
          </div>

          {infoOpen && (
            <div className="bg-[var(--bg-secondary)] rounded-lg p-4 text-xs text-[var(--text-secondary)] space-y-2 border border-[var(--border)]">
              <p><strong className="text-[var(--text-primary)]">Previous Day Doji:</strong> A doji candle has a body less than 10% of its total range (High-Low), indicating indecision between buyers and sellers. It's a potential reversal signal.</p>
              <p><strong className="text-[var(--text-primary)]">9:15 AM High Breakout:</strong> When current price breaks above the high of the first candle of the trading day (9:15 AM), it signals bullish momentum. Combined with a prior doji, this is a high-probability setup.</p>
              <p className="text-[var(--text-muted)]">Signal strength: STRONG = both confirmed | DOJI ONLY = awaiting breakout | BREAKOUT ONLY = no prior doji</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row flex-wrap gap-4 md:gap-6 items-start sm:items-end">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">Index</label>
              <div className="flex gap-2">
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
              <label className="block text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">Signals</label>
              <div className="flex gap-4">
                {[
                  { key: 'doji', label: 'Previous Day Doji' },
                  { key: 'breakout', label: '9:15 AM High Breakout' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options[key]}
                      onChange={() => toggleOption(key)}
                      className="accent-[var(--accent)] w-4 h-4"
                    />
                    <span className="text-sm text-[var(--text-secondary)]">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleRun}
              disabled={scanning || (!options.doji && !options.breakout)}
              className="px-8 py-3 bg-[var(--accent)] text-black font-bold rounded-lg hover:bg-[var(--accent-dim)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {scanning ? 'Scanning...' : '▶ Run Scanner'}
            </button>
          </div>
        </div>

        {scanning && (
          <ScanProgress progress={progress} timeRemaining={timeRemaining} onCancel={cancel} />
        )}

        {!scanning && results.length > 0 && (
          <div className="flex-1 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 overflow-hidden flex flex-col">
            <ScannerResults results={results} />
          </div>
        )}

        {!scanning && results.length === 0 && progress.total > 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
            <div className="text-4xl mb-3">📭</div>
            <p>Scan complete. No stocks matched the selected criteria.</p>
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}
