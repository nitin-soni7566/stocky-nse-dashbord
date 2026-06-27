import { useApp } from '../../context/AppContext.jsx'

const NAV = [
  { id: 'stocklist', icon: '📊', label: 'Stock List' },
  { id: 'scanner', icon: '📡', label: 'Scanner' },
  { id: 'heatmap', icon: '🌡️', label: 'Heatmap' }
]

export function Sidebar() {
  const { state, dispatch } = useApp()
  const setView = id => dispatch({ type: 'SET_VIEW', payload: id })

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-52 border-r border-[var(--border)] bg-[var(--bg-secondary)] flex-col pt-4 flex-shrink-0">
        {NAV.map(item => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors relative
              ${state.activeView === item.id
                ? 'text-[var(--accent)] bg-[var(--bg-hover)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
          >
            {state.activeView === item.id && (
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--accent)]" />
            )}
            <span>{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-secondary)] border-t border-[var(--border)] flex">
        {NAV.map(item => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors
              ${state.activeView === item.id
                ? 'text-[var(--accent)]'
                : 'text-[var(--text-muted)]'
              }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
            {state.activeView === item.id && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--accent)]" style={{ width: `${100 / NAV.length}%`, left: `${(NAV.indexOf(item) / NAV.length) * 100}%` }} />
            )}
          </button>
        ))}
      </nav>
    </>
  )
}
