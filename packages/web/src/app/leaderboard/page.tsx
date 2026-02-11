import { Download, Star, Trophy, TrendingUp, Flame, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QualityBadge } from '@/components/skills/quality-badge';
import Link from 'next/link';
import { formatNumber } from '@/lib/utils';

export const metadata = {
  title: 'Leaderboard',
  description: 'Top QA skills ranked by installs, quality, and trending activity',
};

const leaderboardData = [
  { rank: 1, name: 'Playwright E2E Testing', slug: 'playwright-e2e', author: 'thetestingacademy', installs: 1250, quality: 92, testingTypes: ['e2e', 'visual'], trend: '+12%' },
  { rank: 2, name: 'Cypress E2E Testing', slug: 'cypress-e2e', author: 'thetestingacademy', installs: 1100, quality: 90, testingTypes: ['e2e'], trend: '+8%' },
  { rank: 3, name: 'Jest Unit Testing', slug: 'jest-unit', author: 'thetestingacademy', installs: 980, quality: 91, testingTypes: ['unit'], trend: '+15%' },
  { rank: 4, name: 'Playwright API Testing', slug: 'playwright-api', author: 'thetestingacademy', installs: 890, quality: 88, testingTypes: ['api'], trend: '+6%' },
  { rank: 5, name: 'Selenium Java Testing', slug: 'selenium-java', author: 'thetestingacademy', installs: 720, quality: 85, testingTypes: ['e2e'], trend: '+4%' },
  { rank: 6, name: 'Pytest Patterns', slug: 'pytest-patterns', author: 'thetestingacademy', installs: 720, quality: 88, testingTypes: ['unit', 'integration'], trend: '+10%' },
  { rank: 7, name: 'k6 Performance Testing', slug: 'k6-performance', author: 'thetestingacademy', installs: 650, quality: 87, testingTypes: ['performance'], trend: '+9%' },
  { rank: 8, name: 'CI/CD Pipeline Config', slug: 'cicd-pipeline', author: 'thetestingacademy', installs: 610, quality: 85, testingTypes: ['integration'], trend: '+7%' },
  { rank: 9, name: 'OWASP Security Testing', slug: 'owasp-security', author: 'thetestingacademy', installs: 560, quality: 89, testingTypes: ['security'], trend: '+11%' },
  { rank: 10, name: 'Postman API Testing', slug: 'postman-api', author: 'thetestingacademy', installs: 530, quality: 84, testingTypes: ['api'], trend: '+5%' },
];

const tabs = [
  { id: 'all', label: 'All Time', icon: Trophy },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'hot', label: 'Hot', icon: Flame },
  { id: 'new', label: 'New', icon: Clock },
];

export default function LeaderboardPage() {
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
                  <span className="text-2xl font-bold text-primary">#{skill.rank}</span>
                  {i === 0 && <Trophy className="h-5 w-5 text-yellow-500" />}
                </div>
                <QualityBadge score={skill.quality} />
              </div>
            </CardHeader>
            <CardContent>
              <Link href={`/skills/${skill.author}/${skill.slug}`} className="hover:underline">
                <h3 className="font-semibold">{skill.name}</h3>
              </Link>
              <p className="text-sm text-muted-foreground">by {skill.author}</p>
              <div className="mt-3 flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Download className="h-3 w-3" /> {formatNumber(skill.installs)}
                </span>
                <span className="text-green-600 font-medium">{skill.trend}</span>
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
                {leaderboardData.map((skill) => (
                  <tr key={skill.slug} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-semibold text-primary">#{skill.rank}</td>
                    <td className="px-4 py-3">
                      <Link href={`/skills/${skill.author}/${skill.slug}`} className="font-medium hover:underline">
                        {skill.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{skill.author}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatNumber(skill.installs)}</td>
                    <td className="px-4 py-3 text-right">
                      <QualityBadge score={skill.quality} />
                    </td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium text-sm">{skill.trend}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {skill.testingTypes.map((t) => (
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
