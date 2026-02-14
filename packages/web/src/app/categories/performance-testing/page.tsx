import type { Metadata } from 'next';
import Link from 'next/link';
import { Download, Star, CheckCircle } from 'lucide-react';
import { db } from '@/db';
import { skills } from '@/db/schema';
import { sql, desc } from 'drizzle-orm';
import { generateBreadcrumbJsonLd } from '@/lib/json-ld';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QualityBadge } from '@/components/skills/quality-badge';
import { formatNumber } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Performance Testing Skills for AI Agents',
  description:
    'Performance and load testing skills for AI coding agents. Lighthouse, k6, and performance optimization — curated by The Testing Academy.',
  alternates: { canonical: 'https://qaskills.sh/categories/performance-testing' },
  openGraph: {
    title: 'Performance Testing Skills for AI Agents',
    description:
      'Performance and load testing skills for AI coding agents. Lighthouse, k6, and performance optimization — curated by The Testing Academy.',
    url: 'https://qaskills.sh/categories/performance-testing',
    type: 'website',
  },
};

export default async function PerformanceTestingPage() {
  const categorySkills = await db
    .select()
    .from(skills)
    .where(sql`${skills.testingTypes} @> '["performance"]'::jsonb`)
    .orderBy(desc(skills.installCount));

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Home', url: 'https://qaskills.sh' },
    { name: 'Categories', url: 'https://qaskills.sh/categories' },
    {
      name: 'Performance Testing',
      url: 'https://qaskills.sh/categories/performance-testing',
    },
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Hero section */}
      <div className="mb-8">
        <nav className="mb-4 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/categories" className="hover:text-foreground">
            Categories
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Performance Testing</span>
        </nav>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Performance Testing Skills for AI Agents
        </h1>
        <p className="mt-3 max-w-3xl text-lg text-muted-foreground">
          Performance and load testing skills for AI coding agents. Lighthouse, k6, and
          performance optimization — curated by The Testing Academy.
        </p>
        <div className="mt-4 inline-flex items-center rounded-md border border-border bg-muted/50 px-4 py-2 font-mono text-sm">
          npx qaskills add k6-performance
        </div>
      </div>

      {/* What is performance testing section */}
      <div className="mb-8 rounded-lg bg-muted/50 p-6">
        <h2 className="mb-2 text-lg font-semibold">What is Performance Testing?</h2>
        <p className="text-sm text-muted-foreground">
          Performance testing measures how an application behaves under various load conditions,
          including response times, throughput, resource utilization, and scalability limits. It
          encompasses load testing, stress testing, endurance testing, and spike testing to ensure
          applications meet performance SLAs. Tools like k6, JMeter, Lighthouse, and Gatling help
          teams identify bottlenecks before they reach production. These skills teach your AI agent
          how to design realistic load scenarios, set meaningful thresholds, interpret performance
          metrics, and integrate performance gates into CI/CD pipelines.
        </p>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        {categorySkills.length} skill{categorySkills.length !== 1 ? 's' : ''} available
      </p>

      {/* Skills grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categorySkills.map((skill) => (
          <Link key={skill.id} href={`/skills/${skill.authorName}/${skill.slug}`}>
            <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold">{skill.name}</h3>
                      {skill.verified && (
                        <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">by {skill.authorName}</p>
                  </div>
                  <QualityBadge score={skill.qualityScore} />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="line-clamp-2 text-sm text-muted-foreground">{skill.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(skill.testingTypes as string[]).slice(0, 3).map((type) => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                  {(skill.frameworks as string[]).slice(0, 2).map((fw) => (
                    <Badge key={fw} variant="outline" className="text-xs">
                      {fw}
                    </Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {formatNumber(skill.installCount)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {skill.qualityScore}/100
                  </span>
                </div>
                {skill.featured && (
                  <Badge variant="default" className="ml-auto text-xs">
                    Featured
                  </Badge>
                )}
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>

      {categorySkills.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-lg font-medium">No performance testing skills found</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Check back soon — new skills are added regularly.
          </p>
        </div>
      )}

      {/* Bottom CTA */}
      <div className="mt-12 text-center">
        <Link href="/skills" className="font-medium text-primary hover:underline">
          Browse all QA skills &rarr;
        </Link>
      </div>
    </div>
  );
}
