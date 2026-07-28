// Suspense fallback for lazy-loaded pages — mirrors each page's own skeleton
// grid style closely enough to avoid a layout jump once the real page mounts.
export function PageSkeleton() {
  return (
    <div className="h-full overflow-hidden p-3 md:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton rounded-2xl" style={{ minHeight: 160 }} />
        ))}
      </div>
    </div>
  )
}
