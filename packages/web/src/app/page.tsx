import Link from 'next/link';
import {
  ArrowRight,
  Search,
  Download,
  Zap,
  Shield,
  Eye,
  Gauge,
  Smartphone,
  Code2,
  TestTube,
  Heart,
  Coffee,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QualityBadge } from '@/components/skills/quality-badge';
import { FRAMEWORKS } from '@qaskills/shared';
import { HeroTerminal } from '@/components/home/hero-terminal';
import { AgentMarquee } from '@/components/home/agent-marquee';
import { StatsCounter } from '@/components/home/stats-counter';
import { generateWebsiteJsonLd, generateOrganizationJsonLd } from '@/lib/json-ld';

const featuredSkills = [
  { rank: 1, name: 'Playwright E2E', slug: 'playwright-e2e', types: ['e2e', 'web'], installs: 3200, quality: 95 },
  { rank: 2, name: 'Cypress E2E', slug: 'cypress-e2e', types: ['e2e', 'web'], installs: 2800, quality: 92 },
  { rank: 3, name: 'Jest Unit', slug: 'jest-unit', types: ['unit'], installs: 2400, quality: 90 },
  { rank: 4, name: 'K6 Performance', slug: 'k6-performance', types: ['performance'], installs: 1900, quality: 88 },
  { rank: 5, name: 'OWASP Security', slug: 'owasp-security', types: ['security'], installs: 1600, quality: 85 },
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
        {/* Gradient blur circles */}
        <div className="pointer-events-none absolute -top-40 left-1/4 h-80 w-80 rounded-full bg-primary/10 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-40 right-1/4 h-80 w-80 rounded-full bg-primary/5 blur-[100px]" />

        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-6 animate-fade-in-up">
              Open Source &middot; 20+ QA Skills
            </Badge>
            <h1 className="animate-fade-in-up delay-100 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Give Your AI Agent
              <br />
              <span className="text-primary">QA Superpowers</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl animate-fade-in-up delay-200">
              Install curated testing skills into Claude Code, Cursor, Copilot, and 27+ AI coding
              agents. One command. Instant expertise.
            </p>

            {/* Terminal */}
            <div className="mt-10 animate-fade-in-up delay-300">
              <HeroTerminal />
            </div>

            {/* Value props */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground animate-fade-in-up delay-400">
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Auto-detects framework
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Works with 27+ agents
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                TypeScript first
              </span>
            </div>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-500">
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
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-medium text-muted-foreground mb-4">
            Works with your favorite AI agents
          </p>
        </div>
        <AgentMarquee />
      </section>

      {/* Stats */}
      <section className="border-b border-border py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <StatsCounter />
        </div>
      </section>

      {/* How it works */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">How it works</h2>
            <p className="mt-4 text-muted-foreground">
              Three steps to supercharge your AI agent with QA skills
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Search,
                title: '1. Search',
                description:
                  'Find the perfect QA skill for your testing needs. Filter by framework, testing type, and language.',
              },
              {
                icon: Download,
                title: '2. Install',
                description:
                  'One command installs the skill to your AI agent. Auto-detects Claude Code, Cursor, Copilot, and more.',
              },
              {
                icon: TestTube,
                title: '3. Test',
                description:
                  'Your AI agent now has expert QA knowledge. Write better tests with best practices baked in.',
              },
            ].map((step, i) => (
              <Card
                key={step.title}
                className={`text-center animate-fade-in-up delay-${(i + 1) * 100}`}
              >
                <CardContent className="pt-6">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <step.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Skills */}
      <section className="border-t border-border py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold">Top Skills</h2>
              <p className="mt-2 text-muted-foreground">Most installed QA skills this month</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/leaderboard">
                View Leaderboard <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm text-muted-foreground">
                  <th className="px-4 py-3 font-medium w-12">#</th>
                  <th className="px-4 py-3 font-medium">Skill</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Type</th>
                  <th className="px-4 py-3 font-medium text-right">Installs</th>
                  <th className="px-4 py-3 font-medium text-right hidden sm:table-cell">Quality</th>
                </tr>
              </thead>
              <tbody>
                {featuredSkills.map((skill) => (
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
                      <div className="flex gap-1">
                        {skill.types.map((type) => (
                          <Badge key={type} variant="secondary" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums">
                      {skill.installs.toLocaleString()}
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

      {/* Testing Categories */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">Skills for every testing need</h2>
            <p className="mt-4 text-muted-foreground">
              From E2E to performance, security to accessibility
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {[
              { icon: Code2, name: 'E2E Testing', color: 'text-blue-500' },
              { icon: Zap, name: 'API Testing', color: 'text-green-500' },
              { icon: Gauge, name: 'Performance', color: 'text-red-500' },
              { icon: Shield, name: 'Security', color: 'text-orange-500' },
              { icon: Eye, name: 'Visual Regression', color: 'text-purple-500' },
              { icon: Smartphone, name: 'Mobile Testing', color: 'text-pink-500' },
              { icon: TestTube, name: 'Unit Testing', color: 'text-indigo-500' },
              { icon: Code2, name: 'Integration', color: 'text-yellow-500' },
              { icon: Shield, name: 'Accessibility', color: 'text-teal-500' },
              { icon: Code2, name: 'Contract Testing', color: 'text-cyan-500' },
            ].map((cat) => (
              <Card
                key={cat.name}
                className="text-center hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
              >
                <CardContent className="py-4 px-3">
                  <cat.icon className={`h-6 w-6 mx-auto mb-2 ${cat.color}`} />
                  <p className="text-xs font-medium">{cat.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Frameworks */}
      <section className="border-t border-border py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Works with your tools</h2>
            <p className="mt-4 text-muted-foreground">Skills for all major testing frameworks</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {FRAMEWORKS.map((fw) => (
              <Badge key={fw.id} variant="outline" className="px-4 py-2 text-sm">
                {fw.name}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Support & CTA */}
      <section className="border-t border-border bg-primary/5 py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold">Start in 30 seconds</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join the community of QA engineers using AI agent skills to write better tests, faster.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="rounded-lg border border-border bg-card px-4 py-3 font-mono text-sm shadow-sm">
              <code>npx qaskills search</code>
            </div>
            <Button size="lg" asChild>
              <Link href="/skills">
                Browse All Skills <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Buy Me a Coffee + TheTestingAcademy */}
          <div className="mt-16 flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground">
              QASkills.sh is free &amp; open source. If it helps you, consider supporting us!
            </p>
            <a
              href="https://www.buymeacoffee.com/thetestingacademy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#FFDD00] px-6 py-3 text-sm font-semibold text-black shadow-md hover:bg-[#FFDD00]/90 transition-colors"
            >
              <Coffee className="h-5 w-5" />
              Buy Me a Coffee
            </a>
            <div className="mt-4 flex items-center gap-3">
              <a
                href="https://youtube.com/@TheTestingAcademy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Heart className="h-4 w-4 text-red-500" />
                @TheTestingAcademy — 189K+ Subscribers
              </a>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Built with love by Pramod Dutta &amp; The Testing Academy community
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
