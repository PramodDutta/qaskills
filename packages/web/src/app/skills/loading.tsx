import { Skeleton } from '@/components/ui/skeleton';
import { SkillCardSkeleton } from '@/components/skills/skill-card-skeleton';

export default function SkillsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-5 w-64" />
      </div>

      {/* Search + Sort */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <Skeleton className="h-10 flex-1" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-20 rounded-full" />
          ))}
        </div>
      </div>

      {/* Filter sidebar + grid */}
      <div className="flex gap-8">
        <div className="hidden lg:block w-64 shrink-0 space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-4 w-24 mb-3" />
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="h-6 w-16 rounded-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <SkillCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
