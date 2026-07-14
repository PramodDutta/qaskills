'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ListChecks,
  RotateCcw,
  Search,
} from 'lucide-react';
import type { Roadmap, RoadmapAccent, RoadmapItem } from '@/app/roadmaps/roadmap-data';
import { cn } from '@/lib/utils';

type RoadmapFilter = 'all' | 'remaining' | 'completed';

const accentStyles: Record<
  RoadmapAccent,
  { border: string; badge: string; number: string; progress: string; wash: string }
> = {
  violet: {
    border: 'border-violet-300 dark:border-violet-800',
    badge: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
    number: 'bg-violet-600 text-white',
    progress: 'bg-violet-500',
    wash: 'bg-violet-50/70 dark:bg-violet-950/20',
  },
  amber: {
    border: 'border-amber-300 dark:border-amber-800',
    badge: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
    number: 'bg-amber-500 text-amber-950',
    progress: 'bg-amber-500',
    wash: 'bg-amber-50/70 dark:bg-amber-950/20',
  },
  cyan: {
    border: 'border-cyan-300 dark:border-cyan-800',
    badge: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-200',
    number: 'bg-cyan-500 text-cyan-950',
    progress: 'bg-cyan-500',
    wash: 'bg-cyan-50/70 dark:bg-cyan-950/20',
  },
  rose: {
    border: 'border-rose-300 dark:border-rose-800',
    badge: 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200',
    number: 'bg-rose-500 text-white',
    progress: 'bg-rose-500',
    wash: 'bg-rose-50/70 dark:bg-rose-950/20',
  },
  emerald: {
    border: 'border-emerald-300 dark:border-emerald-800',
    badge: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
    number: 'bg-emerald-600 text-white',
    progress: 'bg-emerald-500',
    wash: 'bg-emerald-50/70 dark:bg-emerald-950/20',
  },
};

const filterLabels: Array<{ value: RoadmapFilter; label: string }> = [
  { value: 'all', label: 'All milestones' },
  { value: 'remaining', label: 'To do' },
  { value: 'completed', label: 'Completed' },
];

function itemMatches(
  item: RoadmapItem,
  filter: RoadmapFilter,
  completed: Set<string>,
  query: string,
) {
  const isCompleted = completed.has(item.id);
  const matchesFilter = filter === 'all' || (filter === 'completed' ? isCompleted : !isCompleted);
  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery =
    normalizedQuery.length === 0 ||
    `${item.title} ${item.description} ${item.schedule} ${item.kind ?? ''}`
      .toLowerCase()
      .includes(normalizedQuery);

  return matchesFilter && matchesQuery;
}

export function RoadmapExplorer({ roadmap }: { roadmap: Roadmap }) {
  const allItems = roadmap.phases.flatMap((phase) => phase.items);
  const defaultCompleted = allItems.filter((item) => item.defaultCompleted).map((item) => item.id);
  const storageKey = `qaskills-roadmap-progress:${roadmap.slug}`;

  const [completed, setCompleted] = useState<Set<string>>(() => new Set(defaultCompleted));
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(
    () => new Set(roadmap.phases[0] ? [roadmap.phases[0].id] : []),
  );
  const [filter, setFilter] = useState<RoadmapFilter>('all');
  const [query, setQuery] = useState('');
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);

  useEffect(() => {
    const validItemIds = new Set(
      roadmap.phases.flatMap((phase) => phase.items.map((item) => item.id)),
    );

    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCompleted(
            new Set(
              parsed.filter((id): id is string => typeof id === 'string' && validItemIds.has(id)),
            ),
          );
        }
      }
    } catch {
      // A blocked or malformed localStorage value should not break the roadmap.
    } finally {
      setHasLoadedStorage(true);
    }
  }, [roadmap, storageKey]);

  useEffect(() => {
    if (!hasLoadedStorage) return;

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(Array.from(completed)));
    } catch {
      // Progress remains usable for the current session when storage is unavailable.
    }
  }, [completed, hasLoadedStorage, storageKey]);

  const completedCount = completed.size;
  const totalCount = allItems.length;
  const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  const allExpanded = expandedPhases.size === roadmap.phases.length;
  const progressLabel =
    roadmap.slug === 'qa-seo-content-roadmap-2026'
      ? 'Editorial roadmap progress'
      : 'Your learning progress';

  const toggleItem = (itemId: string) => {
    setCompleted((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((current) => {
      const next = new Set(current);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  const toggleAllPhases = () => {
    setExpandedPhases(allExpanded ? new Set() : new Set(roadmap.phases.map((phase) => phase.id)));
  };

  const resetProgress = () => {
    setCompleted(new Set(defaultCompleted));
  };

  return (
    <section aria-labelledby="roadmap-tracker-title" data-testid="roadmap-explorer">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <ListChecks className="h-4 w-4" />
              <span id="roadmap-tracker-title">{progressLabel}</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <strong className="text-3xl tracking-tight" data-testid="roadmap-progress-count">
                {completedCount}/{totalCount}
              </strong>
              <span className="text-sm text-muted-foreground">milestones complete</span>
            </div>
            <div
              className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label={progressLabel}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {progress}% complete. Progress is saved only in this browser.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleAllPhases}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
            >
              {allExpanded ? 'Collapse all' : 'Expand all'}
            </button>
            <button
              type="button"
              onClick={resetProgress}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
              Reset progress
            </button>
          </div>
        </div>
      </div>

      <nav
        aria-label="Roadmap phases"
        className="mt-6 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]"
      >
        {roadmap.phases.map((phase) => {
          const styles = accentStyles[phase.accent];
          return (
            <a
              key={phase.id}
              href={`#${phase.id}`}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-transform hover:-translate-y-0.5',
                styles.border,
                styles.badge,
              )}
            >
              {phase.number}. {phase.title}
            </a>
          );
        })}
      </nav>

      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search milestones or keywords..."
            aria-label="Search roadmap milestones"
            className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex flex-wrap gap-1" aria-label="Filter roadmap milestones">
          {filterLabels.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                filter === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-background hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {roadmap.phases.map((phase) => {
          const styles = accentStyles[phase.accent];
          const phaseCompleted = phase.items.filter((item) => completed.has(item.id)).length;
          const phaseProgress = Math.round((phaseCompleted / phase.items.length) * 100);
          const filteredItems = phase.items.filter((item) =>
            itemMatches(item, filter, completed, query),
          );
          const isOpen = expandedPhases.has(phase.id) || query.trim().length > 0;

          if (filteredItems.length === 0 && (filter !== 'all' || query.trim().length > 0)) {
            return null;
          }

          return (
            <article
              key={phase.id}
              id={phase.id}
              className={cn(
                'scroll-mt-28 overflow-hidden rounded-2xl border bg-card shadow-sm',
                styles.border,
              )}
              data-testid={`roadmap-phase-${phase.id}`}
            >
              <button
                type="button"
                onClick={() => togglePhase(phase.id)}
                aria-expanded={isOpen}
                className={cn(
                  'flex w-full items-start gap-4 p-5 text-left transition-colors sm:p-6',
                  styles.wash,
                )}
              >
                <span
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-black shadow-sm',
                    styles.number,
                  )}
                >
                  {phase.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn('text-xs font-bold uppercase tracking-[0.16em]', styles.badge)}
                  >
                    {phase.schedule}
                  </span>
                  <span className="mt-1 block text-lg font-bold tracking-tight sm:text-xl">
                    {phase.title}
                  </span>
                  <span className="mt-1.5 block max-w-3xl text-sm leading-6 text-muted-foreground">
                    {phase.description}
                  </span>
                  <span className="mt-3 flex items-center gap-3">
                    <span className="h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-background/80 sm:max-w-48">
                      <span
                        className={cn(
                          'block h-full rounded-full transition-[width]',
                          styles.progress,
                        )}
                        style={{ width: `${phaseProgress}%` }}
                      />
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {phaseCompleted}/{phase.items.length}
                    </span>
                  </span>
                </span>
                {isOpen ? (
                  <ChevronDown className="mt-2 h-5 w-5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="mt-2 h-5 w-5 shrink-0 text-muted-foreground" />
                )}
              </button>

              <div
                className={cn('border-t border-border p-3 sm:p-4', !isOpen && 'hidden')}
                aria-hidden={!isOpen}
              >
                <ul className="space-y-2">
                  {filteredItems.map((item) => {
                    const isCompleted = completed.has(item.id);
                    return (
                      <li
                        key={item.id}
                        className={cn(
                          'group flex items-start gap-3 rounded-xl border p-3 transition-colors sm:p-4',
                          isCompleted
                            ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20'
                            : 'border-transparent bg-muted/35 hover:border-border hover:bg-muted/60',
                        )}
                        data-testid={`roadmap-item-${item.id}`}
                      >
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isCompleted}
                          aria-label={`${isCompleted ? 'Mark incomplete' : 'Mark complete'}: ${item.title}`}
                          onClick={() => toggleItem(item.id)}
                          className={cn(
                            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                            isCompleted
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-border bg-background text-transparent hover:border-primary',
                          )}
                        >
                          <Check className="h-4 w-4" />
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3
                              className={cn(
                                'font-semibold leading-snug',
                                isCompleted &&
                                  'text-muted-foreground line-through decoration-emerald-500/60',
                              )}
                            >
                              {item.title}
                            </h3>
                            <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                              {item.schedule}
                            </span>
                            {item.kind ? (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                {item.kind}
                              </span>
                            ) : null}
                            {item.status === 'ready' ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                                Ready locally
                              </span>
                            ) : null}
                            {item.status === 'backlog' ? (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                Backlog
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {item.description}
                          </p>
                        </div>

                        {item.href ? (
                          <Link
                            href={item.href}
                            aria-label={`Open resource for ${item.title}`}
                            className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-primary"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
