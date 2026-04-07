import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/db';
import { skills } from '@/db/schema';
import { sql, desc } from 'drizzle-orm';
import { SkillCard } from '@/components/skills/skill-card';
import { generateBreadcrumbJsonLd } from '@/lib/json-ld';

export const metadata: Metadata = {
  title: 'QA Skills for Cline',
  description:
    'Install QA testing skills into Cline. Expert-curated Playwright, Cypress, and testing automation skills.',
  alternates: { canonical: 'https://qaskills.sh/agents/cline' },
  openGraph: {
    title: 'QA Skills for Cline',
    description:
      'Install QA testing skills into Cline. Expert-curated Playwright, Cypress, and testing automation skills.',
    url: 'https://qaskills.sh/agents/cline',
    type: 'website',
  },
};

export default async function ClineAgentPage() {
  const agentSkills = await db
    .select()
    .from(skills)
    .where(sql`${skills.agents} @> '["cline"]'::jsonb`)
    .orderBy(desc(skills.installCount));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'QA Skills for Cline',
            description: 'Browse and install curated QA testing skills for Cline.',
            url: 'https://qaskills.sh/agents/cline',
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: agentSkills.length,
              itemListElement: agentSkills.slice(0, 10).map((skill: any, i: number) => ({
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
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            generateBreadcrumbJsonLd([
              { name: 'Home', url: 'https://qaskills.sh' },
              { name: 'Agents', url: 'https://qaskills.sh/agents' },
              { name: 'Cline', url: 'https://qaskills.sh/agents/cline' },
            ])
          ),
        }}
      />

      {/* Hero Section */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">QA Skills for Cline</h1>
        <p className="mt-3 text-lg text-muted-foreground max-w-3xl">
          Install expert QA testing skills into Cline, the autonomous coding agent for VS Code.
          Give Cline deep knowledge of Playwright, Cypress, Jest, and testing automation best
          practices — from E2E and API testing to security scanning and performance testing.
        </p>
        <div className="mt-6 rounded-lg border border-border bg-muted/50 p-4">
          <p className="text-sm font-medium mb-2">Quick install any skill into Cline:</p>
          <code className="block rounded bg-background px-3 py-2 text-sm font-mono">
            npx qaskills add &lt;skill-name&gt;
          </code>
          <p className="mt-2 text-xs text-muted-foreground">
            Skills are installed to <code className="font-mono">.cline/rules</code> and
            automatically loaded by Cline in your project.
          </p>
        </div>
      </div>

      {/* Skills count */}
      <p className="text-sm text-muted-foreground mb-6">
        {agentSkills.length} skills compatible with Cline
      </p>

      {/* Skills Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agentSkills.map((skill) => (
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

      {agentSkills.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-lg font-medium">No skills found for Cline yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Check back soon or browse all available skills.
          </p>
        </div>
      )}

      {/* CTA */}
      <div className="mt-12 text-center">
        <p className="text-muted-foreground">Looking for more skills?</p>
        <Link href="/skills" className="text-primary hover:underline font-medium">
          Browse all QA skills
        </Link>
      </div>
    </div>
  );
}
