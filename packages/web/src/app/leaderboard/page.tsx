import { Download, Star, Trophy, TrendingUp, Flame, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QualityBadge } from '@/components/skills/quality-badge';
import Link from 'next/link';
import { formatNumber } from '@/lib/utils';
import { db } from '@/db';
import { skills } from '@/db/schema';
import { desc } from 'drizzle-orm';

export const metadata = {
  title: 'Leaderboard',
  description:
    'Top QA skills ranked by installs, quality score, and trending activity. See which testing skills AI agents use most.',
};

const tabs = [
  { id: 'all', label: 'All Time', icon: Trophy },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'hot', label: 'Hot', icon: Flame },
  { id: 'new', label: 'New', icon: Clock },
];

async function getLeaderboardData() {
  try {
    const [allTime, trending, newest] = await Promise.all([
      db.select().from(skills).orderBy(desc(skills.installCount)).limit(20),
      db.select().from(skills).orderBy(desc(skills.weeklyInstalls)).limit(20),
      db.select().from(skills).orderBy(desc(skills.createdAt)).limit(20),
    ]);
    return { allTime, trending, newest };
  } catch {
    return { allTime: [], trending: [], newest: [] };
  }
}

export default async function LeaderboardPage() {
  const { allTime, trending, newest } = await getLeaderboardData();

  // Default view is "All Time" sorted by installCount
  const leaderboardData = allTime;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="mt-2 text-muted-foreground">Top QA skills ranked by installs and quality</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        {tabs.map((tab) => (
          <Badge
            key={tab.id}
            variant={tab.id === 'all' ? 'default' : 'outline'}
            className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5"
          >
            <tab.icon className="h-3 w-3" />
            {tab.label}
          </Badge>
        ))}
      </div>

      {/* Top 3 */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        {leaderboardData.slice(0, 3).map((skill, i) => (
          <Card key={skill.slug} className={i === 0 ? 'border-primary/50 shadow-md' : ''}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-primary">#{i + 1}</span>
                  {i === 0 && <Trophy className="h-5 w-5 text-yellow-500" />}
                </div>
                <QualityBadge score={skill.qualityScore} />
              </div>
            </CardHeader>
            <CardContent>
              <Link href={`/skills/${skill.authorName}/${skill.slug}`} className="hover:underline">
                <h3 className="font-semibold">{skill.name}</h3>
              </Link>
              <p className="text-sm text-muted-foreground">by {skill.authorName}</p>
              <div className="mt-3 flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Download className="h-3 w-3" /> {formatNumber(skill.installCount)}
                </span>
                {skill.weeklyInstalls > 0 && (
                  <span className="text-green-600 font-medium">
                    +{formatNumber(skill.weeklyInstalls)}/wk
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Full table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm text-muted-foreground">
                  <th className="px-4 py-3 font-medium w-16">Rank</th>
                  <th className="px-4 py-3 font-medium">Skill</th>
                  <th className="px-4 py-3 font-medium">Author</th>
                  <th className="px-4 py-3 font-medium text-right">Installs</th>
                  <th className="px-4 py-3 font-medium text-right">Quality</th>
                  <th className="px-4 py-3 font-medium text-right">Trend</th>
                  <th className="px-4 py-3 font-medium">Categories</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leaderboardData.map((skill, idx) => (
                  <tr key={skill.slug} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-semibold text-primary">#{idx + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={`/skills/${skill.authorName}/${skill.slug}`} className="font-medium hover:underline">
                        {skill.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{skill.authorName}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatNumber(skill.installCount)}</td>
                    <td className="px-4 py-3 text-right">
                      <QualityBadge score={skill.qualityScore} />
                    </td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium text-sm">
                      {skill.weeklyInstalls > 0 ? `+${formatNumber(skill.weeklyInstalls)}/wk` : '--'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {(skill.testingTypes as string[]).map((t) => (
                          <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
