import { useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext.jsx'

const DEFAULT_SETTINGS = {
  notifications: false,
}

export function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('app_settings') ?? '{}') }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(s) {
  localStorage.setItem('app_settings', JSON.stringify(s))
}

export function SettingsPanel({ settings, onChange, onClose }) {
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const set = (key, val) => {
    const next = { ...settings, [key]: val }
    onChange(next)
    saveSettings(next)
  }

  const refreshSymbols = async () => {
    try {
      const r = await fetch('/api/refresh-symbols', { method: 'POST' })
      const d = await r.json()
      if (d.success) alert(`✅ Symbols refreshed — Universe ${d.universe}, F&O ${d.niftyFO}`)
      else alert('❌ Failed to refresh symbols')
    } catch {
      alert('❌ Server not reachable')
    }
  }

  const requestNotifications = async () => {
    if (!('Notification' in window)) return alert('Browser does not support notifications')
    const p = await Notification.requestPermission()
    set('notifications', p === 'granted')
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="settings-enter bg-[var(--bg-secondary)] border-l border-[var(--border)] w-full max-w-sm flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] flex-shrink-0">
          <span className="font-semibold text-[var(--text-primary)]">⚙️ Settings</span>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl">×</button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-6">
          <Section title="GENERAL">
            <Row label="Theme" sub={theme === 'dark' ? 'Dark' : 'Light'}>
              <Toggle on={theme === 'light'} onToggle={toggleTheme} />
            </Row>
          </Section>

          <Section title="ALERTS">
            <Row label="Browser notifications" sub={settings.notifications ? 'Enabled — big movers will notify you' : 'Click to enable'}>
              <button
                onClick={requestNotifications}
                className={`px-3 py-1 text-xs rounded border transition-colors ${settings.notifications ? 'border-green-700 text-green-400' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]'}`}
              >
                {settings.notifications ? '✓ Enabled' : 'Enable'}
              </button>
            </Row>
          </Section>

          {!import.meta.env.PROD && (
            <Section title="DATA">
              <button
                onClick={refreshSymbols}
                className="w-full py-2 text-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--accent)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                ↻ Refresh Symbols Now
              </button>
              <div className="text-xs text-[var(--text-muted)] space-y-1 pt-1">
                <div>Stock Universe: <span className="text-[var(--text-secondary)]">~750 symbols</span></div>
                <div>F&O: <span className="text-[var(--text-secondary)]">eligible stocks</span></div>
                <div>Source: NSE India + Upstox</div>
              </div>
            </Section>
          )}

          <Section title="ABOUT">
            <div className="text-xs text-[var(--text-muted)] space-y-1">
              <div>Version: <span className="text-[var(--text-secondary)]">1.0.0</span></div>
              <div>Data: NSE India + Upstox (live)</div>
              <div>Developer: <span className="text-[var(--accent)]">Nitin Soni</span></div>
              <a href="mailto:nitinsoni815@gmail.com" className="text-[var(--accent)] hover:underline block">nitinsoni815@gmail.com</a>
            </div>
          </Section>

          <Section title="KEYBOARD SHORTCUTS">
            <div className="text-xs text-[var(--text-muted)] space-y-1 font-mono">
              {[['1','Dashboard'],['2','Sentiment'],['3','Stock List'],['4','Scanner'],['5','Heatmap'],['R','Refresh data'],['S','Focus search'],['ESC','Close panels']].map(([k,v]) => (
                <div key={k} className="flex justify-between">
                  <span className="bg-[var(--bg-card)] border border-[var(--border)] px-1.5 py-0.5 rounded text-[var(--text-secondary)]">{k}</span>
                  <span className="text-[var(--text-secondary)]">{v}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Row({ label, sub, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm text-[var(--text-primary)]">{label}</p>
        {sub && <p className="text-xs text-[var(--text-muted)]">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ on, onToggle }) {
  return (
    <button
      onClick={() => onToggle(!on)}
      className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 relative ${on ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`}
    >
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

