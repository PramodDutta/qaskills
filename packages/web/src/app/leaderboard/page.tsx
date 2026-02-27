import { Download, Trophy, CheckCircle, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { QualityBadge } from '@/components/skills/quality-badge';
import { FilterTabs, type Tab } from '@/components/leaderboard/filter-tabs';
import { LeaderboardSearch } from '@/components/leaderboard/leaderboard-search';
import Link from 'next/link';
import { formatNumber } from '@/lib/utils';
import { db } from '@/db';
import { skills } from '@/db/schema';
import { desc, sql, ilike } from 'drizzle-orm';

export const metadata = {
  title: 'Leaderboard',
  description:
    'Top QA skills from 280+ curated testing skills ranked by installs, quality score, and trending activity. See which testing skills AI agents use most.',
};

// Revalidate every 5 minutes
export const revalidate = 300;

// Force dynamic rendering to ensure filter params work
export const dynamic = 'force-dynamic';

const tabs: Tab[] = [
  { id: 'all', label: 'All Time', icon: 'Trophy' },
  { id: 'trending', label: 'Trending', icon: 'TrendingUp' },
  { id: 'hot', label: 'Hot', icon: 'Flame' },
  { id: 'new', label: 'New', icon: 'Clock' },
];

// Color system matching homepage typeColors
const typeColors: Record<string, { accent: string; badge: string }> = {
  e2e: {
    accent: 'bg-blue-500',
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  security: {
    accent: 'bg-red-500',
    badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  },
  api: {
    accent: 'bg-purple-500',
    badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
  unit: {
    accent: 'bg-indigo-500',
    badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  },
  performance: {
    accent: 'bg-pink-500',
    badge: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
  },
  load: {
    accent: 'bg-pink-500',
    badge: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
  },
  accessibility: {
    accent: 'bg-teal-500',
    badge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
  },
  visual: {
    accent: 'bg-cyan-500',
    badge: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  },
  integration: {
    accent: 'bg-amber-500',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  bdd: {
    accent: 'bg-orange-500',
    badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  },
  contract: {
    accent: 'bg-emerald-500',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  mobile: {
    accent: 'bg-violet-500',
    badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  },
};

// Skills to highlight with yellow background (like RemoteOK featured)
const HIGHLIGHTED_SLUGS = new Set([
  'playwright-e2e',
  'playwright-advance-e2e',
  'playwright-skill-enhanced',
  'selenium-java',
  'selenium-advance-pom',
]);

// Top 3 get special teal/blue gradient (like RemoteOK promoted)
const TOP_ROW_STYLES = [
  'bg-gradient-to-r from-sky-100 to-cyan-50 dark:from-sky-950/40 dark:to-cyan-950/20 border-sky-200 dark:border-sky-800/50',
  'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800/50',
  'bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/20 border-violet-200 dark:border-violet-800/50',
];

const HIGHLIGHT_STYLE =
  'bg-gradient-to-r from-yellow-100 to-amber-50 dark:from-yellow-950/40 dark:to-amber-950/20 border-yellow-300 dark:border-yellow-700/50';

function getRowStyle(slug: string, rank: number): string {
  if (rank <= 3) return TOP_ROW_STYLES[rank - 1];
  if (HIGHLIGHTED_SLUGS.has(slug)) return HIGHLIGHT_STYLE;
  return 'bg-card border-border hover:border-border/80';
}

function getPrimaryType(testingTypes: string[]): string {
  return testingTypes[0] || 'e2e';
}

async function getLeaderboardData(filter: string = 'all', search: string = '') {
  try {
    const searchFilter = search ? ilike(skills.name, `%${search}%`) : undefined;
    const limit = search ? 50 : 20;

    switch (filter) {
      case 'trending':
        return await db
          .select()
          .from(skills)
          .where(searchFilter)
          .orderBy(desc(skills.weeklyInstalls), desc(skills.createdAt))
          .limit(limit);
      case 'hot':
        return await db
          .select()
          .from(skills)
          .where(searchFilter)
          .orderBy(desc(sql`(${skills.installCount} * 0.7 + ${skills.qualityScore} * 0.3)`))
          .limit(limit);
      case 'new':
        return await db
          .select()
          .from(skills)
          .where(searchFilter)
          .orderBy(desc(skills.createdAt))
          .limit(limit);
      case 'all':
      default:
        return await db
          .select()
          .from(skills)
          .where(searchFilter)
          .orderBy(desc(skills.installCount))
          .limit(limit);
    }
  } catch {
    return [];
  }
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const params = await searchParams;
  const filter = params?.filter || 'all';
  const search = params?.q || '';
  const leaderboardData = await getLeaderboardData(filter, search);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <p className="mt-2 text-muted-foreground">
            Top QA skills ranked by installs and quality across 280+ curated skills
          </p>
        </div>
        <LeaderboardSearch initialQuery={search} />
      </div>

      {/* Tabs */}
      <FilterTabs tabs={tabs} activeFilter={filter} />

      {/* RemoteOK-style card rows */}
      <div className="flex flex-col gap-2.5">
        {leaderboardData.map((skill, idx) => {
          const rank = idx + 1;
          const testingTypes = skill.testingTypes as string[];
          const frameworks = skill.frameworks as string[];
          const primaryType = getPrimaryType(testingTypes);
          const colors = typeColors[primaryType] ?? {
            accent: 'bg-gray-500',
            badge: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
          };
          const rowStyle = getRowStyle(skill.slug, rank);

          return (
            <Link
              key={skill.slug}
              href={`/skills/${skill.authorName}/${skill.slug}`}
              className={`group relative flex items-center gap-3 sm:gap-4 rounded-xl border px-4 py-3.5 sm:py-4 transition-all hover:shadow-md hover:-translate-y-[1px] ${rowStyle}`}
            >
              {/* Left accent bar */}
              <div
                className={`absolute left-0 top-2 bottom-2 w-1 rounded-full ${colors.accent} opacity-60 transition-all group-hover:opacity-100 group-hover:w-1.5`}
              />

              {/* Rank */}
              <div className="w-8 shrink-0 text-center">
                {rank <= 3 ? (
                  <div
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                      rank === 1
                        ? 'bg-yellow-400/20 text-yellow-600 dark:text-yellow-400'
                        : rank === 2
                          ? 'bg-gray-300/20 text-gray-600 dark:text-gray-400'
                          : 'bg-amber-600/20 text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {rank === 1 && <Trophy className="h-4 w-4" />}
                    {rank !== 1 && `#${rank}`}
                  </div>
                ) : (
                  <span className="text-base font-bold text-muted-foreground/50 font-mono">
                    {rank}
                  </span>
                )}
              </div>

              {/* Name + author + description */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate group-hover:text-primary transition-colors">
                    {skill.name}
                  </span>
                  {skill.verified && (
                    <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                  )}
                  {HIGHLIGHTED_SLUGS.has(skill.slug) && rank > 3 && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      HOT
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  <span className="font-medium">{skill.authorName}</span>
                  <span className="mx-1.5 opacity-40">&middot;</span>
                  <span className="hidden sm:inline">{skill.description}</span>
                </p>
              </div>

              {/* Category badges */}
              <div className="hidden md:flex items-center gap-1.5 shrink-0">
                {testingTypes.slice(0, 2).map((t) => {
                  const tc = typeColors[t] ?? {
                    badge: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
                  };
                  return (
                    <span
                      key={`tt-${t}`}
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tc.badge}`}
                    >
                      {t}
                    </span>
                  );
                })}
                {frameworks.slice(0, 1).map((f) => (
                  <Badge key={`fw-${f}`} variant="outline" className="text-[11px] px-2 py-0.5">
                    {f}
                  </Badge>
                ))}
              </div>

              {/* Installs */}
              <div className="hidden sm:flex items-center gap-1.5 shrink-0 text-sm text-muted-foreground tabular-nums">
                <Download className="h-3.5 w-3.5" />
                {formatNumber(skill.installCount)}
              </div>

              {/* Trend */}
              {skill.weeklyInstalls > 0 && (
                <div className="hidden sm:flex items-center gap-1 shrink-0 text-xs font-medium text-green-600 dark:text-green-400">
                  <TrendingUp className="h-3 w-3" />
                  +{formatNumber(skill.weeklyInstalls)}
                </div>
              )}

              {/* Quality */}
              <div className="shrink-0">
                <QualityBadge score={skill.qualityScore} />
              </div>
            </Link>
          );
        })}
      </div>

      {leaderboardData.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">
          No skills found. Check back later.
        </div>
      )}
    </div>
  );
}
