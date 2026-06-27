import { useState, useEffect } from 'react'

export function useMarketStatus() {
  const [status, setStatus] = useState({ isOpen: false, session: 'closed', nextOpen: null, nextClose: null })

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/market-status')
        if (res.ok) setStatus(await res.json())
      } catch {
        // server may not be running in build mode
      }
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  return status
}
