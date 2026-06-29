import { useState, useEffect } from 'react'

const STEPS = [
  {
    title: 'Welcome to Stocky NSE Dashboard',
    body: 'Your real-time Indian stock market command center.\nLive prices · Doji Scanner · Sector Heatmap',
    action: 'Get Started →'
  },
  {
    title: 'Loading Stock Universe',
    body: null,
    action: 'Continue →'
  },
  {
    title: "You're all set! 🎉",
    body: "Market opens at 9:15 AM IST. Here's what to do:\n• Page 1 (key 1): Monitor live prices across Nifty 200/500\n• Page 2 (key 2): Run Doji + 9:15 scanner at market open\n• Page 3 (key 3): Check sector heatmap for market mood",
    action: 'Open Dashboard →'
  }
]

export function OnboardingWizard({ onDone }) {
  const [step, setStep] = useState(0)
  const [symbolLog, setSymbolLog] = useState([])
  const [fetching, setFetching] = useState(false)
  const [fetchDone, setFetchDone] = useState(false)

  useEffect(() => {
    if (step === 1 && !fetching && !fetchDone) {
      setFetching(true)
      setSymbolLog(['Connecting to NSE India...'])
      fetch('/api/refresh-symbols', { method: 'POST' })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setSymbolLog(l => [...l,
              `✅ Nifty 200: ${data.nifty200} stocks loaded`,
              `✅ Nifty 500: ${data.nifty500} stocks loaded`,
              '🎯 Ready!'
            ])
          } else {
            setSymbolLog(l => [...l, '⚠️ Using cached symbols (NSE unreachable)'])
          }
          setFetchDone(true)
        })
        .catch(() => {
          setSymbolLog(l => [...l, '⚠️ Using cached symbols (server not running)'])
          setFetchDone(true)
        })
    }
  }, [step, fetching, fetchDone])

  const canProceed = step !== 1 || fetchDone

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      localStorage.setItem('app_initialized', 'true')
      onDone()
    }
  }

  const current = STEPS[step]

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-6">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl p-8 flex flex-col gap-6">
        {/* Progress dots */}
        <div className="flex gap-2 justify-center">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-8 bg-[var(--accent)]' : i < step ? 'w-4 bg-[var(--accent-dim)]' : 'w-4 bg-[var(--border)]'}`} />
          ))}
        </div>

        <div className="text-center space-y-3">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest">Step {step + 1} of {STEPS.length}</p>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{current.title}</h2>
          {current.body && (
            <p className="text-sm text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
              {current.body}
            </p>
          )}
        </div>

        {step === 1 && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 font-mono text-sm space-y-1.5 min-h-[100px]">
            {symbolLog.map((line, i) => (
              <div key={i} className="text-[var(--text-secondary)]">{line}</div>
            ))}
            {fetching && !fetchDone && (
              <div className="text-[var(--accent)] animate-pulse">Downloading...</div>
            )}
          </div>
        )}

        <button
          onClick={handleNext}
          disabled={!canProceed}
          className="w-full py-3 bg-[var(--accent)] text-black font-bold rounded-xl hover:bg-[var(--accent-dim)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
        >
          {current.action}
        </button>

        <button onClick={() => { localStorage.setItem('app_initialized', 'true'); onDone() }}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-center">
          Skip setup
        </button>
      </div>
    </div>
  )
}
