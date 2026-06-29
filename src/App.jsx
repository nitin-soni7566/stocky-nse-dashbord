import { useState, useEffect, useCallback } from 'react'
import { useApp } from './context/AppContext.jsx'
import { Header } from './components/Layout/Header.jsx'
import { Sidebar } from './components/Layout/Sidebar.jsx'
import { MarketBanner } from './components/Layout/MarketBanner.jsx'
import { StockList } from './components/StockList/StockList.jsx'
import { Scanner } from './components/Scanner/Scanner.jsx'
import { Heatmap } from './components/Heatmap/Heatmap.jsx'
import { OnboardingWizard } from './components/Onboarding/OnboardingWizard.jsx'
import { SettingsPanel, loadSettings } from './components/Settings/SettingsPanel.jsx'

function Toast({ toast }) {
  const { dispatch } = useApp()
  const colors = {
    success: 'border-green-700 bg-green-900/30 text-green-300',
    error: 'border-red-700 bg-red-900/30 text-red-300',
    info: 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)]'
  }
  return (
    <div className={`px-4 py-3 rounded-lg border text-sm ${colors[toast.type] ?? colors.info} shadow-xl`}>
      <div className="flex items-center justify-between gap-3">
        <span>{toast.message}</span>
        <button onClick={() => dispatch({ type: 'REMOVE_TOAST', payload: toast.id })}
          className="opacity-60 hover:opacity-100 text-base leading-none">×</button>
      </div>
    </div>
  )
}

export default function App() {
  const { state, dispatch } = useApp()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState(loadSettings)

  // First-time onboarding
  useEffect(() => {
    if (!localStorage.getItem('app_initialized')) setShowOnboarding(true)
  }, [])

  // Keyboard shortcuts
  const handleKey = useCallback(e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey) return
    switch (e.key) {
      case '1': dispatch({ type: 'SET_VIEW', payload: 'stocklist' }); break
      case '2': dispatch({ type: 'SET_VIEW', payload: 'scanner' }); break
      case '3': dispatch({ type: 'SET_VIEW', payload: 'heatmap' }); break
      case 'r': case 'R': dispatch({ type: 'REFRESH_CURRENT' }); break
      case 's': case 'S':
        if (state.activeView === 'stocklist') {
          document.querySelector('input[type="text"]')?.focus()
        }
        break
      case 'Escape':
        setSettingsOpen(false)
        break
    }
  }, [dispatch, state.activeView])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  const views = {
    stocklist: <StockList />,
    scanner: <Scanner />,
    heatmap: <Heatmap />
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header onSettingsOpen={() => setSettingsOpen(true)} />
      <MarketBanner />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden flex flex-col pb-16 md:pb-0">
          <div className="flex-1 overflow-hidden">
            {views[state.activeView] ?? <StockList />}
          </div>
          <footer className="flex-shrink-0 border-t border-[var(--border)] px-4 md:px-6 py-2 flex items-center justify-end gap-3">
            <span className="text-xs text-[var(--text-muted)]">Developed by</span>
            <span className="text-xs font-medium text-[var(--text-secondary)]">Nitin Soni</span>
            <span className="text-[var(--border)]">·</span>
            <a href="mailto:nitinsoni815@gmail.com" className="text-xs text-[var(--accent)] hover:underline">
              nitinsoni815@gmail.com
            </a>
          </footer>
        </main>
      </div>

      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 flex flex-col gap-2 z-50 max-w-xs md:max-w-sm w-full">
        {state.toasts.map(toast => <Toast key={toast.id} toast={toast} />)}
      </div>

      {showOnboarding && <OnboardingWizard onDone={() => setShowOnboarding(false)} />}

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}
