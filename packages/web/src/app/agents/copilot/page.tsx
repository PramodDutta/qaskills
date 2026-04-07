import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/db';
import { skills } from '@/db/schema';
import { sql, desc } from 'drizzle-orm';
import { SkillCard } from '@/components/skills/skill-card';
import { generateBreadcrumbJsonLd } from '@/lib/json-ld';

export const metadata: Metadata = {
  title: 'QA Skills for GitHub Copilot',
  description:
    'Enhance GitHub Copilot with QA testing skills. Playwright, Cypress, Jest, and more — install in seconds.',
  alternates: { canonical: 'https://qaskills.sh/agents/copilot' },
  openGraph: {
    title: 'QA Skills for GitHub Copilot',
    description:
      'Enhance GitHub Copilot with QA testing skills. Playwright, Cypress, Jest, and more — install in seconds.',
    url: 'https://qaskills.sh/agents/copilot',
    type: 'website',
  },
};

export default async function CopilotAgentPage() {
  const agentSkills = await db
    .select()
    .from(skills)
    .where(sql`${skills.agents} @> '["github-copilot"]'::jsonb`)
    .orderBy(desc(skills.installCount));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'QA Skills for GitHub Copilot',
            description: 'Browse and install curated QA testing skills for GitHub Copilot.',
            url: 'https://qaskills.sh/agents/copilot',
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
              { name: 'GitHub Copilot', url: 'https://qaskills.sh/agents/copilot' },
            ])
          ),
        }}
      />

      {/* Hero Section */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          QA Skills for GitHub Copilot
        </h1>
        <p className="mt-3 text-lg text-muted-foreground max-w-3xl">
          Enhance GitHub Copilot with expert QA testing skills. Install curated testing
          instructions for Playwright, Cypress, Jest, and more — giving Copilot deep knowledge of
          testing best practices, patterns, and frameworks.
        </p>
        <div className="mt-6 rounded-lg border border-border bg-muted/50 p-4">
          <p className="text-sm font-medium mb-2">Quick install any skill for GitHub Copilot:</p>
          <code className="block rounded bg-background px-3 py-2 text-sm font-mono">
            npx qaskills add &lt;skill-name&gt;
          </code>
          <p className="mt-2 text-xs text-muted-foreground">
            Skills are installed to{' '}
            <code className="font-mono">.github/copilot-instructions</code> and automatically
            referenced by Copilot in your repository.
          </p>
        </div>
      </div>

      {/* Skills count */}
      <p className="text-sm text-muted-foreground mb-6">
        {agentSkills.length} skills compatible with GitHub Copilot
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
          <p className="text-lg font-medium">No skills found for GitHub Copilot yet</p>
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
