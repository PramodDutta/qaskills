import Link from 'next/link';
import { ArrowRight, Download, Trophy, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QualityBadge } from '@/components/skills/quality-badge';
import { HeroTerminal } from '@/components/home/hero-terminal';
import { AgentMarquee } from '@/components/home/agent-marquee';
import { StatsCounter } from '@/components/home/stats-counter';
import { generateWebsiteJsonLd, generateOrganizationJsonLd } from '@/lib/json-ld';

const typeColors: Record<string, { accent: string; badge: string }> = {
  'E2E': { accent: 'bg-blue-500', badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  'Security': { accent: 'bg-red-500', badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
  'API': { accent: 'bg-purple-500', badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  'CI/CD': { accent: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  'A11y': { accent: 'bg-teal-500', badge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' },
  'Unit': { accent: 'bg-indigo-500', badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
  'Debug': { accent: 'bg-orange-500', badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
  'Perf': { accent: 'bg-pink-500', badge: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20' },
  'Browser': { accent: 'bg-cyan-500', badge: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' },
};

// Highlighted skills get yellow background (synced with leaderboard + skills pages)
const HIGHLIGHTED_HOME_SLUGS = new Set([
  'playwright-e2e',
  'selenium-advance-pom',
]);

function getHomeRowStyle(slug: string, rank: number): string {
  if (rank === 1) return 'bg-gradient-to-r from-sky-100 to-cyan-50 dark:from-sky-950/40 dark:to-cyan-950/20 border-sky-200 dark:border-sky-800/50';
  if (HIGHLIGHTED_HOME_SLUGS.has(slug) || rank === 2) return 'bg-gradient-to-r from-yellow-100 to-amber-50 dark:from-yellow-950/40 dark:to-amber-950/20 border-yellow-300 dark:border-yellow-700/50';
  return 'bg-card border-border hover:border-border/80';
}

const topSkills = [
  { rank: 1, name: 'Playwright E2E', slug: 'playwright-e2e', type: 'E2E', installs: 86, quality: 92, author: 'thetestingacademy', desc: 'Full E2E testing patterns with POM, fixtures, and CI integration' },
  { rank: 2, name: 'Selenium Advanced POM', slug: 'selenium-advance-pom', type: 'E2E', installs: 78, quality: 93, author: 'thetestingacademy', desc: 'Advanced Page Object Model with fluent API and retry logic' },
  { rank: 3, name: 'Vibe Check', slug: 'vibe-check', type: 'Browser', installs: 75, quality: 95, author: 'vibiumdev', desc: 'AI-native browser automation — 81 CLI commands, 2.6k GitHub stars' },
  { rank: 4, name: 'Agent Browser', slug: 'agent-browser', type: 'Browser', installs: 72, quality: 95, author: 'vercel-labs', desc: 'AI-powered browser automation with smart element detection' },
  { rank: 5, name: 'API Test Suite Generator', slug: 'api-test-suite-generator', type: 'API', installs: 71, quality: 91, author: 'Pramod', desc: 'Auto-generate REST & GraphQL test suites from OpenAPI specs' },
  { rank: 6, name: 'Flaky Test Quarantine', slug: 'flaky-test-quarantine', type: 'CI/CD', installs: 69, quality: 89, author: 'Pramod', desc: 'Detect, isolate, and track flaky tests in your pipeline' },
  { rank: 7, name: 'Auth Bypass Tester', slug: 'auth-bypass-tester', type: 'Security', installs: 67, quality: 90, author: 'Pramod', desc: 'Test authentication flows for common bypass vulnerabilities' },
  { rank: 8, name: 'Accessibility Auditor', slug: 'accessibility-auditor', type: 'A11y', installs: 65, quality: 91, author: 'Pramod', desc: 'WCAG 2.2 compliance checks with axe-core integration' },
  { rank: 9, name: 'Jest Unit', slug: 'jest-unit', type: 'Unit', installs: 64, quality: 91, author: 'thetestingacademy', desc: 'Modern Jest patterns with mocking, snapshots, and coverage' },
  { rank: 10, name: 'Production Smoke Suite', slug: 'production-smoke-suite', type: 'E2E', installs: 62, quality: 88, author: 'Pramod', desc: 'Critical-path smoke tests for production deployments' },
];

const categories = [
  { name: 'Bug Hunting', count: 11, href: '/skills?testingTypes=security', desc: 'Find race conditions, memory leaks, auth bypasses' },
  { name: 'Test Generation', count: 14, href: '/skills?testingTypes=unit', desc: 'Auto-generate test cases, data factories, mutations' },
  { name: 'Performance', count: 8, href: '/categories/performance-testing', desc: 'Page speed, N+1 queries, load testing' },
  { name: 'Accessibility', count: 6, href: '/categories/accessibility-testing', desc: 'WCAG audits, screen readers, keyboard nav' },
  { name: 'CI/CD', count: 8, href: '/skills?testingTypes=code-quality', desc: 'Flaky tests, coverage gaps, pipeline optimization' },
  { name: 'E2E Testing', count: 20, href: '/categories/e2e-testing', desc: 'Playwright, Selenium, Cypress patterns' },
];

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([generateWebsiteJsonLd(), generateOrganizationJsonLd()]),
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute -top-40 left-1/4 h-80 w-80 rounded-full bg-primary/10 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-40 right-1/4 h-80 w-80 rounded-full bg-primary/5 blur-[100px]" />

        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-6 animate-fade-in-up">
              Open Source &middot; 280+ Skills
            </Badge>
            <h1 className="animate-fade-in-up delay-100 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              QA Skills for
              <br />
              <span className="text-primary">AI Coding Agents</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground animate-fade-in-up delay-200">
              One command. Expert testing knowledge in Claude Code, Cursor, Copilot, and 29 agents.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-250">
              <Button size="lg" asChild>
                <Link href="/skills">
                  Browse Skills <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/getting-started">Get Started</Link>
              </Button>
            </div>

            <div className="mt-10 animate-fade-in-up delay-300">
              <HeroTerminal />
            </div>
          </div>
        </div>
      </section>

      {/* Leaderboard Preview — immediately after hero */}
      <section className="py-16 border-b border-border">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              <h2 className="text-2xl font-bold">Leaderboard</h2>
              <Badge variant="secondary" className="text-xs">Top 10</Badge>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/leaderboard"
                className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Search 280+ skills...</span>
              </Link>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/leaderboard">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            {topSkills.map((skill) => {
              const colors = typeColors[skill.type] ?? { accent: 'bg-gray-500', badge: 'bg-gray-500/10 text-gray-600 border-gray-500/20' };
              const rowStyle = getHomeRowStyle(skill.slug, skill.rank);
              return (
                <Link
                  key={skill.slug}
                  href={`/skills/${skill.author}/${skill.slug}`}
                  className={`group relative flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-all hover:shadow-md hover:-translate-y-[1px] ${rowStyle}`}
                >
                  {/* Left accent bar */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${colors.accent} opacity-60 transition-all group-hover:opacity-100 group-hover:w-1.5`}
                  />

                  {/* Rank */}
                  <span className="w-8 shrink-0 text-center text-lg font-bold text-muted-foreground/50 font-mono">
                    {skill.rank}
                  </span>

                  {/* Name + author + desc */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate group-hover:text-primary transition-colors">
                        {skill.name}
                      </span>
                      <span className={`hidden sm:inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${colors.badge}`}>
                        {skill.type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      <span className="font-medium">{skill.author}</span>
                      <span className="mx-1.5 opacity-40">&middot;</span>
                      <span className="hidden sm:inline">{skill.desc}</span>
                    </p>
                  </div>

                  {/* Installs */}
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0 text-sm text-muted-foreground tabular-nums">
                    <Download className="h-3.5 w-3.5" />
                    {skill.installs}
                  </div>

                  {/* Quality */}
                  <div className="shrink-0">
                    <QualityBadge score={skill.quality} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Agent Marquee */}
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Works with your favorite AI agents
          </p>
        </div>
        <AgentMarquee />
      </section>

      {/* Stats */}
      <section className="py-16 border-b border-border">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <StatsCounter />
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 border-b border-border bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold">Skills for Every Testing Need</h2>
            <p className="mt-2 text-muted-foreground">
              From bug hunting to CI/CD optimization, find the right skill for your workflow.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                href={cat.href}
                className="group rounded-lg border border-border bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold group-hover:text-primary transition-colors">{cat.name}</h3>
                  <Badge variant="secondary" className="text-xs">{cat.count}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{cat.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Video */}
      <section className="py-16 border-b border-border">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold">See It in Action</h2>
            <p className="mt-2 text-muted-foreground">
              Watch how QA Skills works with your AI coding agent in under 6 minutes.
            </p>
          </div>
          <div className="relative rounded-xl overflow-hidden border border-border shadow-lg" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src="https://www.loom.com/embed/8cce720ebed54c8a9eae992087062f07"
              frameBorder="0"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
              title="QA Skills Demo Video"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border py-16">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold">Start in 30 seconds</h2>
          <p className="mt-3 text-muted-foreground">
            Install a skill and your AI agent writes better tests immediately.
          </p>
          <div className="mt-6 inline-flex items-center gap-3 rounded-lg border border-border bg-card px-5 py-3 font-mono text-sm">
            <code>npx @qaskills/cli add playwright-e2e</code>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-muted-foreground">
            <Link href="/getting-started" className="hover:text-foreground transition-colors underline underline-offset-4">
              Getting started guide
            </Link>
            <span className="hidden sm:inline">&middot;</span>
            <Link href="/blog" className="hover:text-foreground transition-colors underline underline-offset-4">
              Read the blog
            </Link>
            <span className="hidden sm:inline">&middot;</span>
            <Link href="/agents" className="hover:text-foreground transition-colors underline underline-offset-4">
              Browse by agent
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
