import { Skeleton } from '@/components/ui/skeleton';

export default function LeaderboardLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="mt-2 h-5 w-80" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-md" />
        ))}
      </div>

      {/* Top 3 cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-6 w-10 rounded-md" />
            </div>
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-4" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Table rows */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border/50 last:border-0">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-20 ml-auto" />
            <Skeleton className="h-6 w-8 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
