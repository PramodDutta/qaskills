import { Download, Package, Star, Plus, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QualityBadge } from '@/components/skills/quality-badge';
import { formatNumber } from '@/lib/utils';
import { eq, or } from 'drizzle-orm';

export const metadata = {
  title: 'Dashboard',
  description: 'Manage your published QA skills',
};

async function getClerkUserId(): Promise<string | null> {
  try {
    const { auth } = await import('@clerk/nextjs/server');
    const { userId } = await auth();
    return userId;
  } catch {
    return null;
  }
}

interface DashboardSkill {
  name: string;
  slug: string;
  installs: number;
  quality: number;
  status: string;
  createdAt: Date;
}

interface DashboardData {
  stats: {
    totalInstalls: number;
    skillsPublished: number;
    averageQuality: number;
  };
  publishedSkills: DashboardSkill[];
  userName: string | null;
  hasUser: boolean;
}

async function getDashboardData(): Promise<DashboardData> {
  const fallback: DashboardData = {
    stats: { totalInstalls: 0, skillsPublished: 0, averageQuality: 0 },
    publishedSkills: [],
    userName: null,
    hasUser: false,
  };

  try {
    const clerkId = await getClerkUserId();
    if (!clerkId) return fallback;

    const { db } = await import('@/db');
    const { users, skills } = await import('@/db/schema');

    // Find user by clerkId
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

    if (!user) {
      return { ...fallback, hasUser: false };
    }

    // Find skills authored by this user (by authorId or username match)
    const userSkills = await db
      .select()
      .from(skills)
      .where(
        or(
          eq(skills.authorId, user.id),
          eq(skills.authorName, user.username),
        ),
      );

    const totalInstalls = userSkills.reduce(
      (sum, s) => sum + (s.installCount || 0),
      0,
    );
    const averageQuality =
      userSkills.length > 0
        ? Math.round(
            userSkills.reduce((sum, s) => sum + (s.qualityScore || 0), 0) /
              userSkills.length,
          )
        : 0;

    const publishedSkills: DashboardSkill[] = userSkills.map((s) => ({
      name: s.name,
      slug: s.slug,
      installs: s.installCount || 0,
      quality: s.qualityScore || 0,
      status: 'published',
      createdAt: s.createdAt,
    }));

    return {
      stats: {
        totalInstalls,
        skillsPublished: userSkills.length,
        averageQuality,
      },
      publishedSkills,
      userName: user.name || user.username,
      hasUser: true,
    };
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    return fallback;
  }
}

export default async function DashboardPage() {
  const { stats, publishedSkills, userName, hasUser } =
    await getDashboardData();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            {userName
              ? `Welcome back, ${userName}`
              : 'Manage your published QA skills'}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/publish">
            <Plus className="h-4 w-4" /> Publish Skill
          </Link>
        </Button>
      </div>

      {!hasUser && (
        <Card className="mb-8">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Welcome! Publish your first skill</h3>
            <p className="mt-2 text-muted-foreground">
              Get started by publishing a QA skill to the directory.
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/publish">
                <Plus className="h-4 w-4" /> Publish Skill
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

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
                  <th className="px-6 py-3 font-medium text-right">Created</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {publishedSkills.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No skills published yet. Click &quot;Publish Skill&quot; to get started.
                    </td>
                  </tr>
                )}
                {publishedSkills.map((skill) => (
                  <tr key={skill.slug} className="hover:bg-muted/50">
                    <td className="px-6 py-4">
                      <Link href={`/skills/${skill.slug}`} className="font-medium hover:underline">
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
                    <td className="px-6 py-4 text-right text-sm text-muted-foreground">
                      {new Date(skill.createdAt).toLocaleDateString()}
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
