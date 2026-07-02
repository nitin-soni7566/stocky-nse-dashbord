import { useSentimentData } from '../../hooks/useSentimentData.js'
import { ErrorBoundary } from '../UI/ErrorBoundary.jsx'
import { TickerStrip } from './TickerStrip.jsx'
import { IndexCards } from './IndexCards.jsx'
import { AdvanceDecline } from './AdvanceDecline.jsx'
import { NiftyFIICard } from './NiftyFIICard.jsx'
import { VixMeter } from './VixMeter.jsx'
import { SentimentGauge } from './SentimentGauge.jsx'

export function SentimentPage() {
  const {
    indices, adData, niftyHistory, sensexHistory, vixStats,
    fiiData, fiiError, sentiment, pageError, retry, stocksLoaded
  } = useSentimentData()

  return (
    <ErrorBoundary>
      <div className="h-full overflow-auto">
        <div className="mx-auto flex flex-col gap-3" style={{ maxWidth: 1200, padding: 16 }}>

          {pageError && (
            <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'rgba(229,57,53,0.4)', background: 'rgba(229,57,53,0.08)', color: '#E53935' }}>
              <span>Live data unavailable</span>
              <button onClick={retry} className="text-xs font-medium underline hover:no-underline">Retry</button>
            </div>
          )}

          <TickerStrip indices={indices} onRetry={retry} />

          <IndexCards indices={indices} onRetry={retry} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AdvanceDecline adData={adData} stocksLoaded={stocksLoaded} />
            <NiftyFIICard indices={indices} niftyHistory={niftyHistory} sensexHistory={sensexHistory} fiiData={fiiData} fiiError={fiiError} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <VixMeter indices={indices} vixStats={vixStats} />
            <SentimentGauge sentiment={sentiment} indices={indices} />
          </div>

        </div>
      </div>
    </ErrorBoundary>
  )
}
