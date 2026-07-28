import { FixedSizeList } from 'react-window'
import { useElementSize } from '../../hooks/useElementSize.js'

// Virtualizes a single-column list of items (only the visible rows mount) —
// used for the mobile StockCard view and other long lists (100+ items) so
// per-card effects (e.g. StockCard's sparkline fetch) stay cheap.
export function VirtualCardList({ items, itemHeight, renderItem, gap = 10 }) {
  const [setRef, { height }] = useElementSize()

  return (
    <div ref={setRef} className="flex-1 min-h-[300px]">
      {height > 0 && (
        <FixedSizeList height={height} width="100%" itemCount={items.length} itemSize={itemHeight + gap}>
          {({ index, style }) => (
            <div style={{ ...style, paddingBottom: gap }}>
              {renderItem(items[index], index)}
            </div>
          )}
        </FixedSizeList>
      )}
    </div>
  )
}
