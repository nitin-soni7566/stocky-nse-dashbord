import { useState, useRef, useCallback, useLayoutEffect } from 'react'

// Tracks an element's content box size via ResizeObserver — used to feed
// react-window's FixedSizeList/Grid a real pixel height (no AutoSizer dep).
export function useElementSize() {
  const [size, setSize] = useState({ width: 0, height: 0 })
  const ref = useRef(null)

  const setRef = useCallback(node => {
    ref.current = node
  }, [])

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setSize({ width, height })
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref.current])

  return [setRef, size]
}
