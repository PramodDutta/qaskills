import { Skeleton } from '@/components/ui/skeleton';

export default function SkillDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <Skeleton className="h-4 w-28 mb-6" />

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-6 w-10 rounded-md" />
            </div>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-4 h-5 w-full" />
            <Skeleton className="mt-1 h-5 w-3/4" />
            <div className="mt-4 flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-16 rounded-full" />
              ))}
            </div>
          </div>

          {/* Install card */}
          <div className="rounded-lg border border-border bg-card p-6">
            <Skeleton className="h-5 w-16 mb-4" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="mt-3 h-4 w-3/4" />
          </div>

          {/* Description card */}
          <div className="rounded-lg border border-border bg-card p-6">
            <Skeleton className="h-5 w-32 mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <Skeleton className="h-5 w-40 mb-4" />
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 15 }).map((_, i) => (
                <Skeleton key={i} className="h-8 rounded-md" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
