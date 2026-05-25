import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Terminal, CheckCircle2, Zap, Star } from 'lucide-react';
import { db } from '@/db';
import { skills } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { SkillCard } from '@/components/skills/skill-card';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { generateBreadcrumbJsonLd, generateFAQJsonLd } from '@/lib/json-ld';
import {
  findHub,
  allHubSlugs,
  buildHubFilter,
  type HubEntry,
} from '@/lib/skills-for-hubs';

const ICONS = { zap: Zap, check: CheckCircle2, terminal: Terminal, star: Star } as const;

interface HubPageProps {
  params: Promise<{ topic: string }>;
}

export async function generateStaticParams() {
  return allHubSlugs().map((topic) => ({ topic }));
}

export async function generateMetadata({ params }: HubPageProps): Promise<Metadata> {
  const { topic } = await params;
  const hub = findHub(topic);
  if (!hub) return { title: 'Skills Hub Not Found' };

  const url = `https://qaskills.sh/skills-for/${topic}`;
  return {
    title: hub.title,
    description: hub.description,
    alternates: { canonical: url },
    openGraph: {
      title: hub.title,
      description: hub.description,
      url,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: hub.title,
      description: hub.description,
    },
  };
}

function HubSchema({ hub, topic, count, topSkills }: { hub: HubEntry; topic: string; count: number; topSkills: Array<{ name: string; slug: string; authorName: string }> }) {
  const url = `https://qaskills.sh/skills-for/${topic}`;
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            generateBreadcrumbJsonLd([
              { name: 'Home', url: 'https://qaskills.sh' },
              { name: 'Skills For', url: 'https://qaskills.sh/skills-for' },
              { name: hub.h1, url },
            ])
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: hub.h1,
            description: hub.description,
            url,
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: count,
              itemListElement: topSkills.slice(0, 10).map((skill, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: skill.name,
                url: `https://qaskills.sh/skills/${skill.authorName}/${skill.slug}`,
              })),
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQJsonLd(hub.faqs)) }}
      />
    </>
  );
}

export default async function HubPage({ params }: HubPageProps) {
  const { topic } = await params;
  const hub = findHub(topic);
  if (!hub) notFound();

  const filterClause = buildHubFilter(hub.filter);
  const topSkills = await db
    .select()
    .from(skills)
    .where(filterClause)
    .orderBy(desc(skills.installCount))
    .limit(24);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <HubSchema hub={hub} topic={topic} count={topSkills.length} topSkills={topSkills} />

      {/* Hero */}
      <div className="mb-12 text-center">
        <Badge variant="secondary" className="mb-4">
          Skills Hub
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{hub.h1}</h1>
        <p className="mx-auto mt-4 max-w-3xl text-lg text-muted-foreground">{hub.intro}</p>

        <Card className="mx-auto mt-8 max-w-2xl border-primary/40 bg-primary/5">
          <CardContent className="pt-6">
            <p className="mb-2 text-sm font-medium">Install in 5 seconds:</p>
            <pre className="overflow-x-auto rounded-md border border-border bg-background p-3 text-left text-sm">
              <code>{hub.installCmd}</code>
            </pre>
          </CardContent>
        </Card>
      </div>

      {/* Value props */}
      <div className="mb-16 grid gap-4 sm:grid-cols-3">
        {hub.valueProps.map((p) => {
          const Icon = ICONS[p.icon];
          return (
            <Card key={p.title}>
              <CardContent className="pt-6">
                <Icon className="mb-3 h-6 w-6 text-primary" />
                <h2 className="mb-1 font-semibold">{p.title}</h2>
                <p className="text-sm text-muted-foreground">{p.body}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Top skills grid */}
      <div className="mb-16">
        <h2 className="mb-2 text-2xl font-bold">Top {topSkills.length} Skills</h2>
        <p className="mb-6 text-muted-foreground">
          Ranked by install count. All quality-scored 0-100.
        </p>

        {topSkills.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topSkills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={{
                  id: skill.id,
                  name: skill.name,
                  slug: skill.slug,
                  description: skill.description,
                  author: skill.authorName,
                  qualityScore: skill.qualityScore,
                  installCount: skill.installCount,
                  testingTypes: skill.testingTypes,
                  frameworks: skill.frameworks,
                  featured: skill.featured,
                  verified: skill.verified,
                  createdAt: skill.createdAt.toISOString(),
                }}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-muted/30 p-8 text-center">
            <p className="font-medium">
              No matching skills yet. Browse{' '}
              <Link href="/skills" className="text-primary hover:underline">
                all skills
              </Link>{' '}
              or{' '}
              <Link href="/how-to-publish" className="text-primary hover:underline">
                publish the first one
              </Link>
              .
            </p>
          </div>
        )}

        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link href="/skills">
              See all 500+ skills <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Related deep-dive articles */}
      {hub.relatedArticles.length > 0 && (
        <div className="mb-16">
          <h2 className="mb-2 text-2xl font-bold">Deep-Dive Articles</h2>
          <p className="mb-6 text-muted-foreground">3000+ word references for each topic.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {hub.relatedArticles.map((a) => (
              <Link
                key={a.slug}
                href={`/blog/${a.slug}`}
                className="group flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
              >
                <span className="font-medium">{a.title}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* FAQ */}
      <div className="mb-16">
        <h2 className="mb-6 text-2xl font-bold">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {hub.faqs.map((f) => (
            <Card key={f.q}>
              <CardContent className="pt-6">
                <h3 className="mb-2 font-semibold">{f.q}</h3>
                <p className="text-sm text-muted-foreground">{f.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <h2 className="text-2xl font-bold">Ready to ship better tests?</h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Install your first skill in 5 seconds. Browse all 500+ skills or jump straight
          into the recommended starter.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/skills">
              Browse 500+ Skills <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          {hub.ctaSkillSlug ? (
            <Button size="lg" variant="outline" asChild>
              <Link href={`/skills/${hub.ctaSkillSlug}`}>
                <Terminal className="h-4 w-4" />{' '}
                {hub.ctaSkillLabel || 'Start with starter skill'}
              </Link>
            </Button>
          ) : (
            <Button size="lg" variant="outline" asChild>
              <Link href="/skills">
                <Terminal className="h-4 w-4" />{' '}
                {hub.ctaSkillLabel || 'Browse all skills'}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
