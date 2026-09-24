function Skeleton({ className = "", style }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-white/5 ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card p-5 flex items-start gap-4">
      <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function ChartCardSkeleton({ height = 260 }) {
  return (
    <div className="card p-6">
      <Skeleton className="h-3 w-40 mb-6" />
      <Skeleton className="w-full" style={{ height }} />
    </div>
  );
}

export default Skeleton;
