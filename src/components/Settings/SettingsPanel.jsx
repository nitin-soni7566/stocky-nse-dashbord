import { useEffect } from 'react'

const DEFAULT_SETTINGS = {
  volumeFormat: 'indian',
  indianNumbers: true,
  notifications: false,
  dojiThreshold: 0.1,
  volumeRatio: 2.0,
  scanBatch: 5,
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
      if (d.success) alert(`✅ Symbols refreshed — Total ${d.nifty750}, 500 ${d.nifty500}, 200 ${d.nifty200}, F&O ${d.niftyFO}`)
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
            <Row label="Volume format" sub="Display in Lakhs / Crores">
              <Toggle on={settings.volumeFormat === 'indian'} onToggle={v => set('volumeFormat', v ? 'indian' : 'raw')} />
            </Row>
            <Row label="Indian number format" sub="₹1,23,456 vs ₹123,456">
              <Toggle on={settings.indianNumbers} onToggle={v => set('indianNumbers', v)} />
            </Row>
          </Section>

          <Section title="ALERTS">
            <Row label="Browser notifications" sub={settings.notifications ? 'Enabled' : 'Click to enable'}>
              <button
                onClick={requestNotifications}
                className={`px-3 py-1 text-xs rounded border transition-colors ${settings.notifications ? 'border-green-700 text-green-400' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]'}`}
              >
                {settings.notifications ? '✓ Enabled' : 'Enable'}
              </button>
            </Row>
          </Section>

          <Section title="DATA">
            <button
              onClick={refreshSymbols}
              className="w-full py-2 text-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--accent)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              ↻ Refresh Symbols Now
            </button>
            <div className="text-xs text-[var(--text-muted)] space-y-1 pt-1">
              <div>Nifty Total: <span className="text-[var(--text-secondary)]">~750 symbols</span></div>
              <div>Nifty 500: <span className="text-[var(--text-secondary)]">500 symbols</span></div>
              <div>Nifty 200: <span className="text-[var(--text-secondary)]">200 symbols</span></div>
              <div>F&O: <span className="text-[var(--text-secondary)]">eligible stocks</span></div>
              <div>Source: NSE India + Upstox</div>
            </div>
          </Section>

          <Section title="SCANNER DEFAULTS">
            <NumberRow label="Min Doji strength" value={settings.dojiThreshold} min={0.05} max={0.25} step={0.01}
              onChange={v => set('dojiThreshold', v)} />
            <NumberRow label="Volume ratio threshold" value={settings.volumeRatio} min={1.5} max={5} step={0.5}
              onChange={v => set('volumeRatio', v)} />
            <NumberRow label="Scan batch size" value={settings.scanBatch} min={2} max={10} step={1}
              onChange={v => set('scanBatch', v)} />
          </Section>

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
              {[['1','Sentiment'],['2','Stock List'],['3','Scanner'],['4','Heatmap'],['R','Refresh data'],['S','Focus search'],['ESC','Close panels']].map(([k,v]) => (
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

function NumberRow({ label, value, min, max, step, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-[var(--text-primary)]">{label}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}
          className="w-6 h-6 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center text-sm">−</button>
        <span className="font-mono text-sm text-[var(--text-primary)] w-10 text-center">{value}</span>
        <button onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))}
          className="w-6 h-6 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center text-sm">+</button>
      </div>
    </div>
  )
}
