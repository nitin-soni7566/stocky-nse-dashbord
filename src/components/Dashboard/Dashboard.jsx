import { useGainersLosers } from '../../hooks/useGainersLosers.js'
import { ALL_STOCKS } from '../../utils/instruments.js'
import { ErrorBoundary } from '../UI/ErrorBoundary.jsx'
import { MarketSummaryCard } from './MarketSummaryCard.jsx'
import { GainersLosersPreview } from './GainersLosersPreview.jsx'
import { TrendingStocks } from './TrendingStocks.jsx'
import { MostActiveStocks } from './MostActiveStocks.jsx'
import { SectorPerformance } from './SectorPerformance.jsx'
import { MarketBreadth } from './MarketBreadth.jsx'
import { HeatmapPreview } from './HeatmapPreview.jsx'
import { WatchlistWidget } from './WatchlistWidget.jsx'
import { ScannerPreviewWidget } from './ScannerPreviewWidget.jsx'
import { RecentAlerts } from './RecentAlerts.jsx'

// Single top-level composer: fetches the Gainers/Losers universe + quotes ONCE
// here and passes them down as props, so every widget below shares one
// SSE/poll subscription instead of each opening its own (see plan Phase 4).
export function Dashboard() {
  const { gainers, losers, quotes, loading } = useGainersLosers()

  return (
    <ErrorBoundary>
      <div className="h-full overflow-y-auto p-3 md:p-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton rounded-2xl" style={{ minHeight: 160 }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <MarketSummaryCard />
            <GainersLosersPreview gainers={gainers} losers={losers} />
            <TrendingStocks quotes={quotes} />
            <MostActiveStocks quotes={quotes} />
            <SectorPerformance gainers={gainers} losers={losers} quotes={quotes} />
            <MarketBreadth quotes={quotes} />
            <HeatmapPreview gainers={gainers} losers={losers} quotes={quotes} />
            <WatchlistWidget quotes={quotes} />
            <ScannerPreviewWidget />
            <RecentAlerts stocks={ALL_STOCKS} quotes={quotes} />
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}
