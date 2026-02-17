import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QualityBadge } from '@/components/skills/quality-badge';
import { HeroTerminal } from '@/components/home/hero-terminal';
import { AgentMarquee } from '@/components/home/agent-marquee';
import { generateWebsiteJsonLd, generateOrganizationJsonLd } from '@/lib/json-ld';

const topSkills = [
  { rank: 1, name: 'Playwright E2E', slug: 'playwright-e2e', type: 'E2E', installs: 86, quality: 92 },
  { rank: 2, name: 'Agent Browser', slug: 'agent-browser', type: 'Browser', installs: 72, quality: 95 },
  { rank: 3, name: 'Browser Use', slug: 'browser-use', type: 'Browser', installs: 68, quality: 94 },
  { rank: 4, name: 'Web App Testing', slug: 'webapp-testing', type: 'E2E', installs: 65, quality: 93 },
  { rank: 5, name: 'Jest Unit', slug: 'jest-unit', type: 'Unit', installs: 64, quality: 91 },
  { rank: 6, name: 'TDD Patterns', slug: 'test-driven-development', type: 'TDD', installs: 61, quality: 92 },
  { rank: 7, name: 'Code Review', slug: 'code-review-excellence', type: 'Quality', installs: 59, quality: 91 },
  { rank: 8, name: 'Cypress E2E', slug: 'cypress-e2e', type: 'E2E', installs: 58, quality: 90 },
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
              Open Source &middot; 45+ Skills
            </Badge>
            <h1 className="animate-fade-in-up delay-100 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              QA Skills for
              <br />
              <span className="text-primary">AI Coding Agents</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground animate-fade-in-up delay-200">
              One command. Expert testing knowledge in Claude Code, Cursor, Copilot, and 30+ agents.
            </p>

            <div className="mt-10 animate-fade-in-up delay-300">
              <HeroTerminal />
            </div>

            <div className="mt-10 mx-auto max-w-2xl w-full animate-fade-in-up delay-350">
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

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-400">
              <Button size="lg" asChild>
                <Link href="/skills">
                  Browse Skills <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/getting-started">Get Started</Link>
              </Button>
            </div>
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

      {/* Top Skills */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Top Skills</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/skills">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium w-10">#</th>
                  <th className="px-4 py-3 font-medium">Skill</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Type</th>
                  <th className="px-4 py-3 font-medium text-right">Installs</th>
                  <th className="px-4 py-3 font-medium text-right hidden sm:table-cell">Quality</th>
                </tr>
              </thead>
              <tbody>
                {topSkills.map((skill) => (
                  <tr
                    key={skill.slug}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                      {skill.rank}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/skills/thetestingacademy/${skill.slug}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {skill.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant="secondary" className="text-xs">
                        {skill.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums">
                      {skill.installs}
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <QualityBadge score={skill.quality} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
