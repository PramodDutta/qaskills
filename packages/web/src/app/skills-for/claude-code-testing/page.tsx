import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Terminal, CheckCircle2, Zap } from 'lucide-react';
import { db } from '@/db';
import { skills } from '@/db/schema';
import { sql, desc } from 'drizzle-orm';
import { SkillCard } from '@/components/skills/skill-card';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  generateBreadcrumbJsonLd,
  generateFAQJsonLd,
} from '@/lib/json-ld';

const CANONICAL = 'https://qaskills.sh/skills-for/claude-code-testing';

export const metadata: Metadata = {
  title: 'Best Claude Code Skills for Testing & QA 2026',
  description:
    '100+ Claude Code skills for testing and QA. Playwright, Cypress, Selenium, pytest, API contract, performance, security — install in one command.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Best Claude Code Skills for Testing & QA 2026',
    description:
      'Curated Claude Code skills for QA testing. Playwright, Cypress, pytest, performance, security. Install with npx qaskills add.',
    url: CANONICAL,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best Claude Code Skills for Testing & QA 2026',
    description:
      'Curated Claude Code skills for QA testing. Install in one command.',
  },
};

const faqs = [
  {
    q: 'What are Claude Code skills for testing?',
    a: 'Claude Code skills for testing are SKILL.md files that teach Anthropic Claude Code (the official CLI agent) how to write tests using specific frameworks like Playwright, Cypress, pytest, JUnit, or k6. Each skill ships expert patterns, locator strategies, fixture setups, and assertion conventions so Claude writes production-quality tests on the first try.',
  },
  {
    q: 'How do I install a Claude Code testing skill?',
    a: 'Run `npx @qaskills/cli add <skill-name>` in your project. The CLI auto-detects Claude Code and writes the skill to `~/.claude/skills/<skill>/SKILL.md` (global) or `<repo>/.claude/skills/<skill>/SKILL.md` (project). Claude picks it up on the next session.',
  },
  {
    q: 'Which testing skills work best with Claude Code?',
    a: 'Highest install counts are playwright-e2e, cypress-e2e, selenium-advance-pom, pytest-patterns, jest-unit, react-testing-library, k6-performance, api-testing-rest, and testcontainers-postgres. All work seamlessly with Claude Code 1.0+.',
  },
  {
    q: 'Do these skills work with Claude Desktop or only Claude Code?',
    a: 'These are designed for Claude Code (the CLI). Claude Desktop uses a different skill format. For Desktop, use the Anthropic Skills marketplace. QASkills.sh specifically targets the coding agents that read SKILL.md files (Claude Code, Cursor, Copilot, Windsurf, etc.).',
  },
  {
    q: 'Are Claude Code skills free?',
    a: 'Yes. All skills on QASkills.sh are MIT licensed and free. Some advanced skill packs are available as premium bundles, but the core skills cover every major testing framework at no cost.',
  },
  {
    q: 'Can I write my own Claude Code testing skill?',
    a: 'Yes. See /how-to-publish — create a SKILL.md, validate with `npx @qaskills/skill-validator`, publish with `npx @qaskills/cli publish`. Your skill becomes installable by every QASkills.sh user within 30 seconds.',
  },
];

const valueProps = [
  {
    icon: Zap,
    title: 'One-command install',
    body: 'No copy-paste. CLI detects Claude Code and writes SKILL.md to the right path.',
  },
  {
    icon: CheckCircle2,
    title: 'Quality-scored',
    body: 'Every skill scored 0-100 on content depth, install retention, review rating.',
  },
  {
    icon: Terminal,
    title: 'Real-world patterns',
    body: 'Page Object Model, fixtures, contract testing, CI integration — not just docs.',
  },
];

const relatedArticles = [
  {
    slug: 'best-claude-code-skills-for-testing-2026',
    title: 'Best Claude Code Skills for Testing in 2026',
  },
  {
    slug: 'best-claude-code-skills-for-automated-testing',
    title: 'Best Claude Code Skills for Automated Testing',
  },
  {
    slug: 'claude-code-qa-testing-workflows-2026',
    title: 'Claude Code QA Testing Workflows 2026',
  },
  {
    slug: 'claude-for-qa-engineers-complete-guide',
    title: 'Claude for QA Engineers — Complete Guide',
  },
  {
    slug: 'claude-qa-agent-setup-guide',
    title: 'Claude QA Agent Setup Guide',
  },
  {
    slug: 'must-have-qa-skills-claude-code-2026',
    title: 'Must-Have QA Skills for Claude Code 2026',
  },
  {
    slug: 'playwright-mcp-claude-code-setup-2026',
    title: 'Playwright MCP + Claude Code Setup 2026',
  },
  {
    slug: 'how-to-install-skills-claude-code',
    title: 'How to Install Skills in Claude Code',
  },
];

export default async function ClaudeCodeTestingHubPage() {
  // Top 24 Claude-Code-compatible testing skills by install count
  const topSkills = await db
    .select()
    .from(skills)
    .where(sql`${skills.agents} @> '["claude-code"]'::jsonb`)
    .orderBy(desc(skills.installCount))
    .limit(24);

  const totalCount = topSkills.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Breadcrumb + Collection + FAQ schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            generateBreadcrumbJsonLd([
              { name: 'Home', url: 'https://qaskills.sh' },
              { name: 'Skills For', url: 'https://qaskills.sh/skills-for' },
              { name: 'Claude Code Testing', url: CANONICAL },
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
            name: 'Best Claude Code Skills for Testing & QA 2026',
            description:
              'Curated Claude Code skills for QA testing. Playwright, Cypress, pytest, k6, security, contract testing.',
            url: CANONICAL,
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: topSkills.length,
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQJsonLd(faqs)) }}
      />

      {/* Hero */}
      <div className="mb-12 text-center">
        <Badge variant="secondary" className="mb-4">
          Claude Code Skills Hub
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Best Claude Code Skills for Testing &amp; QA 2026
        </h1>
        <p className="mx-auto mt-4 max-w-3xl text-lg text-muted-foreground">
          {totalCount}+ curated SKILL.md files that teach Claude Code expert testing
          patterns. Playwright, Cypress, Selenium, pytest, JUnit, k6, REST Assured,
          Pact, and more. One command. Production-quality tests in your next session.
        </p>

        {/* Install command */}
        <Card className="mx-auto mt-8 max-w-2xl border-primary/40 bg-primary/5">
          <CardContent className="pt-6">
            <p className="mb-2 text-sm font-medium">Install any skill in 5 seconds:</p>
            <pre className="overflow-x-auto rounded-md border border-border bg-background p-3 text-left text-sm">
              <code>{`# Pick a skill from the grid below
npx @qaskills/cli add playwright-e2e

# Claude Code picks it up on next session
# Writes to ~/.claude/skills/playwright-e2e/SKILL.md`}</code>
            </pre>
          </CardContent>
        </Card>
      </div>

      {/* Value props */}
      <div className="mb-16 grid gap-4 sm:grid-cols-3">
        {valueProps.map((p) => (
          <Card key={p.title}>
            <CardContent className="pt-6">
              <p.icon className="mb-3 h-6 w-6 text-primary" />
              <h2 className="mb-1 font-semibold">{p.title}</h2>
              <p className="text-sm text-muted-foreground">{p.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top skills grid */}
      <div className="mb-16">
        <h2 className="mb-2 text-2xl font-bold">
          Top {topSkills.length} Claude Code Testing Skills
        </h2>
        <p className="mb-6 text-muted-foreground">
          Ranked by install count. All skills compatible with Claude Code 1.0+.
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
              Skills are loading. Visit{' '}
              <Link href="/agents/claude-code" className="text-primary hover:underline">
                /agents/claude-code
              </Link>{' '}
              for the full list.
            </p>
          </div>
        )}

        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link href="/agents/claude-code">
              See all Claude Code skills <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Related deep-dive articles */}
      <div className="mb-16">
        <h2 className="mb-2 text-2xl font-bold">Deep-Dive Articles</h2>
        <p className="mb-6 text-muted-foreground">
          3000+ word references on each Claude Code testing topic.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {relatedArticles.map((a) => (
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

      {/* FAQ */}
      <div className="mb-16">
        <h2 className="mb-6 text-2xl font-bold">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faqs.map((f) => (
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
          Install your first Claude Code testing skill in 5 seconds. Browse all 500+
          skills or jump straight into the Playwright E2E skill — most popular pick
          for first-time users.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/skills">
              Browse 500+ Skills <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/skills/thetestingacademy/playwright-e2e">
              <Terminal className="h-4 w-4" /> Start with Playwright E2E
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
