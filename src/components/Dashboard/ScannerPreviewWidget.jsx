import { DashboardCard } from './DashboardCard.jsx'
import { useApp } from '../../context/AppContext.jsx'

const CAPABILITIES = ['Doji + Breakout', 'RSI / EMA / SMA', 'VWAP', 'Gap Up/Down', 'Live price/volume filters']

export function ScannerPreviewWidget() {
  const { dispatch } = useApp()

  return (
    <DashboardCard title="Scanner" icon="📡">
      <p className="text-xs text-[var(--text-muted)]">
        Find setups across Top Gainers, Losers &amp; F&amp;O with real-time and indicator-based filters.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {CAPABILITIES.map(c => (
          <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-hover)] text-[var(--text-secondary)] border border-[var(--border)]">{c}</span>
        ))}
      </div>
      <button
        onClick={() => dispatch({ type: 'SET_VIEW', payload: 'scanner' })}
        className="mt-1 px-4 py-2 bg-[var(--accent)] text-black font-semibold rounded-lg hover:bg-[var(--accent-dim)] transition-colors text-xs self-start"
      >
        ▶ Open Scanner
      </button>
    </DashboardCard>
  )
}
