import { Download, Package, Star, Plus, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QualityBadge } from '@/components/skills/quality-badge';
import { formatNumber } from '@/lib/utils';

export const metadata = {
  title: 'Dashboard',
  description: 'Manage your published QA skills',
};

export default function DashboardPage() {
  // TODO: Fetch real data from DB based on authenticated user
  const stats = {
    totalInstalls: 3420,
    skillsPublished: 5,
    averageQuality: 87,
  };

  const publishedSkills = [
    { name: 'Playwright E2E Testing', slug: 'playwright-e2e', installs: 1250, quality: 92, status: 'published' },
    { name: 'Playwright API Testing', slug: 'playwright-api', installs: 890, quality: 88, status: 'published' },
    { name: 'Visual Regression Testing', slug: 'visual-regression', installs: 430, quality: 86, status: 'published' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Manage your published QA skills</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/publish">
            <Plus className="h-4 w-4" /> Publish Skill
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Installs</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalInstalls)}</div>
            <p className="text-xs text-muted-foreground">Across all published skills</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Skills Published</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.skillsPublished}</div>
            <p className="text-xs text-muted-foreground">Active skills in directory</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Quality Score</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageQuality}/100</div>
            <p className="text-xs text-muted-foreground">Across all skills</p>
          </CardContent>
        </Card>
      </div>

      {/* Skills table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Skills</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Skill</th>
                  <th className="px-6 py-3 font-medium text-right">Installs</th>
                  <th className="px-6 py-3 font-medium text-right">Quality</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {publishedSkills.map((skill) => (
                  <tr key={skill.slug} className="hover:bg-muted/50">
                    <td className="px-6 py-4">
                      <Link href={`/skills/thetestingacademy/${skill.slug}`} className="font-medium hover:underline">
                        {skill.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-right">{formatNumber(skill.installs)}</td>
                    <td className="px-6 py-4 text-right">
                      <QualityBadge score={skill.quality} />
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="success" className="text-xs">{skill.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm">
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">Edit</Button>
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
