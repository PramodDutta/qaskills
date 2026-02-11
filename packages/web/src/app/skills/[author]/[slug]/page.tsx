import { notFound } from 'next/navigation';
import { ArrowLeft, Download, Star, Calendar, GitBranch, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InstallButton } from '@/components/skills/install-button';
import { QualityBadge } from '@/components/skills/quality-badge';
import { CompatibilityMatrix } from '@/components/skills/compatibility-matrix';
import { formatNumber } from '@/lib/utils';
import type { Metadata } from 'next';
import { db } from '@/db';
import { skills } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface SkillPageProps {
  params: Promise<{ author: string; slug: string }>;
}

async function getSkill(slug: string) {
  try {
    const rows = await db.select().from(skills).where(eq(skills.slug, slug)).limit(1);
    return rows[0] || null;
  } catch {
    // Fallback for when DB is not connected
    return getLocalSkill(slug);
  }
}

function getLocalSkill(slug: string) {
  const seedSkills: Record<string, { name: string; description: string; fullDescription: string; author: string; version: string; license: string; qualityScore: number; installCount: number; weeklyInstalls: number; testingTypes: string[]; frameworks: string[]; languages: string[]; domains: string[]; agents: string[]; featured: boolean; verified: boolean; githubUrl: string }> = {
    'playwright-e2e': {
      name: 'Playwright E2E Testing',
      description: 'Comprehensive Playwright end-to-end testing patterns with Page Object Model, fixtures, and best practices',
      fullDescription: '# Playwright E2E Testing\n\nComprehensive patterns for writing robust Playwright E2E tests.\n\n## Features\n- Page Object Model pattern\n- Auto-waiting locators\n- Fixture-based test setup\n- Cross-browser testing\n- Visual comparisons\n- API mocking with route handlers\n\n## Usage\n\nOnce installed, your AI agent will follow Playwright best practices when writing E2E tests.',
      author: 'thetestingacademy', version: '1.0.0', license: 'MIT', qualityScore: 92, installCount: 1250, weeklyInstalls: 120,
      testingTypes: ['e2e', 'visual'], frameworks: ['playwright'], languages: ['typescript', 'javascript'], domains: ['web'],
      agents: ['claude-code', 'cursor', 'github-copilot', 'windsurf', 'codex', 'aider', 'continue', 'cline', 'zed', 'bolt'],
      featured: true, verified: true, githubUrl: 'https://github.com/TheTestingAcademy/qaskills-playwright-e2e',
    },
  };
  return seedSkills[slug] || null;
}

export async function generateMetadata({ params }: SkillPageProps): Promise<Metadata> {
  const { slug } = await params;
  const skill = await getSkill(slug);
  if (!skill) return { title: 'Skill Not Found' };

  return {
    title: skill.name,
    description: skill.description,
    openGraph: {
      title: `${skill.name} | QA Skills`,
      description: skill.description,
    },
  };
}

export default async function SkillDetailPage({ params }: SkillPageProps) {
  const { author, slug } = await params;
  const skill = await getSkill(slug);

  if (!skill) notFound();

  const agents = 'agents' in skill ? (skill.agents as string[]) : [];
  const testingTypes = 'testingTypes' in skill ? (skill.testingTypes as string[]) : [];
  const frameworks = 'frameworks' in skill ? (skill.frameworks as string[]) : [];
  const languages = 'languages' in skill ? (skill.languages as string[]) : [];
  const domains = 'domains' in skill ? (skill.domains as string[]) : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/skills" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Skills
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold">{skill.name}</h1>
                  {skill.verified && <CheckCircle className="h-6 w-6 text-primary" />}
                  <QualityBadge score={skill.qualityScore} size="md" />
                </div>
                <p className="mt-1 text-muted-foreground">
                  by <span className="font-medium text-foreground">{'authorName' in skill ? (skill.authorName as string) : (skill as Record<string, unknown>).author as string || 'unknown'}</span>
                </p>
              </div>
            </div>
            <p className="mt-4 text-lg text-muted-foreground">{skill.description}</p>

            {/* Tags */}
            <div className="mt-4 flex flex-wrap gap-2">
              {testingTypes.map((t) => (
                <Badge key={t} variant="default">{t}</Badge>
              ))}
              {frameworks.map((f) => (
                <Badge key={f} variant="secondary">{f}</Badge>
              ))}
              {languages.map((l) => (
                <Badge key={l} variant="outline">{l}</Badge>
              ))}
              {domains.map((d) => (
                <Badge key={d} variant="outline">{d}</Badge>
              ))}
            </div>
          </div>

          {/* Install command */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Install</CardTitle>
            </CardHeader>
            <CardContent>
              <InstallButton skillSlug={slug} />
              <p className="mt-3 text-sm text-muted-foreground">
                Auto-detects your AI agent and installs the skill. Works with Claude Code, Cursor, Copilot, and more.
              </p>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">About this skill</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {'fullDescription' in skill && skill.fullDescription ? (
                  <div dangerouslySetInnerHTML={{ __html: (skill.fullDescription as string).replace(/\n/g, '<br/>') }} />
                ) : (
                  <p>{skill.description}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* CI/CD Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">CI/CD Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">GitHub Actions</h4>
                  <pre className="rounded-md bg-muted p-3 text-sm overflow-x-auto">
                    <code>{`- name: Install QA Skills
  run: npx qaskills add ${slug}`}</code>
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Download className="h-4 w-4" /> Total Installs
                  </span>
                  <span className="font-semibold">{formatNumber(skill.installCount)}</span>
                </div>
                {'weeklyInstalls' in skill && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Download className="h-4 w-4" /> This Week
                    </span>
                    <span className="font-semibold">{formatNumber(skill.weeklyInstalls as number)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Star className="h-4 w-4" /> Quality Score
                  </span>
                  <QualityBadge score={skill.qualityScore} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Version
                  </span>
                  <span className="text-sm">{'version' in skill ? (skill.version as string) : '1.0.0'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <GitBranch className="h-4 w-4" /> License
                  </span>
                  <span className="text-sm">{'license' in skill ? (skill.license as string) : 'MIT'}</span>
                </div>
              </div>

              {'githubUrl' in skill && skill.githubUrl && (
                <div className="mt-4 pt-4 border-t border-border">
                  <Button variant="outline" className="w-full" asChild>
                    <a href={skill.githubUrl as string} target="_blank" rel="noopener noreferrer">
                      View on GitHub
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compatibility */}
          <CompatibilityMatrix supportedAgents={agents} />
        </div>
      </div>
    </div>
  );
}
