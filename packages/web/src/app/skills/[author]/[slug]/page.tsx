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
import { eq, and } from 'drizzle-orm';
import { generateSkillJsonLd, generateBreadcrumbJsonLd } from '@/lib/json-ld';
import { ReviewSection } from '@/components/skills/review-section';
import { SkillDescription } from '@/components/skills/skill-description';
import { SkillDownloadButtons } from '@/components/skills/skill-download-buttons';
import { CloneButton } from '@/components/skills/clone-button';

interface SkillPageProps {
  params: Promise<{ author: string; slug: string }>;
}

async function getSkill(author: string, slug: string) {
  try {
    const rows = await db
      .select()
      .from(skills)
      .where(and(eq(skills.authorName, author), eq(skills.slug, slug)))
      .limit(1);
    return rows[0] || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: SkillPageProps): Promise<Metadata> {
  const { author, slug } = await params;
  const skill = await getSkill(author, slug);
  if (!skill) return { title: 'Skill Not Found' };

  const title = skill.name;
  const description = skill.description;
  const ogImageUrl = `/api/og?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&type=skill`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | QASkills.sh`,
      description,
      url: `https://qaskills.sh/skills/${author}/${slug}`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | QASkills.sh`,
      description,
      images: [ogImageUrl],
    },
    alternates: { canonical: `https://qaskills.sh/skills/${author}/${slug}` },
  };
}

export default async function SkillDetailPage({ params }: SkillPageProps) {
  const { author, slug } = await params;

  let skill;
  try {
    skill = await getSkill(author, slug);
  } catch {
    notFound();
  }

  if (!skill) notFound();

  const agents = skill.agents as string[];
  const testingTypes = skill.testingTypes as string[];
  const frameworks = skill.frameworks as string[];
  const languages = skill.languages as string[];
  const domains = skill.domains as string[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            generateSkillJsonLd({
              name: skill.name,
              description: skill.description,
              author: skill.authorName,
              installCount: skill.installCount,
              qualityScore: skill.qualityScore,
              slug,
            }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            generateBreadcrumbJsonLd([
              { name: 'Home', url: 'https://qaskills.sh' },
              { name: 'Skills', url: 'https://qaskills.sh/skills' },
              { name: skill.name, url: `https://qaskills.sh/skills/${skill.authorName}/${skill.slug}` },
            ])
          ),
        }}
      />
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
                  by <span className="font-medium text-foreground">{skill.authorName}</span>
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
              <SkillDownloadButtons
                slug={slug}
                name={skill.name}
                version={skill.version}
                description={skill.description}
                agents={agents}
              />
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">About this skill</CardTitle>
            </CardHeader>
            <CardContent>
              {skill.fullDescription ? (
                <SkillDescription content={skill.fullDescription} />
              ) : (
                <p className="text-muted-foreground">{skill.description}</p>
              )}
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
  run: npx @qaskills/cli add ${slug}`}</code>
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reviews & Ratings */}
          <ReviewSection skillId={skill.id} />
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
                {skill.weeklyInstalls > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Download className="h-4 w-4" /> This Week
                    </span>
                    <span className="font-semibold">{formatNumber(skill.weeklyInstalls)}</span>
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
                  <span className="text-sm">{skill.version}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <GitBranch className="h-4 w-4" /> License
                  </span>
                  <span className="text-sm">{skill.license}</span>
                </div>
              </div>

              {skill.githubUrl && (
                <div className="mt-4 pt-4 border-t border-border">
                  <Button variant="outline" className="w-full" asChild>
                    <a
                      href={skill.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-fast-goal="click_github_repo"
                      data-fast-goal-skill={skill.slug}
                    >
                      View on GitHub
                    </a>
                  </Button>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-border">
                <CloneButton author={skill.authorName} slug={skill.slug} />
              </div>
            </CardContent>
          </Card>

          {/* Compatibility */}
          <CompatibilityMatrix supportedAgents={agents} />
        </div>
      </div>
    </div>
  );
}
