import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { StepCard } from '@/components/getting-started/step-card';
import { SkillPicker } from '@/components/getting-started/skill-picker';

export const metadata: Metadata = {
  title: 'Getting Started',
  description:
    'Install your first QA skill in under 30 seconds. Step-by-step guide for all AI agents.',
};

export default function GettingStartedPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            name: 'Install QA Skills into AI Coding Agents',
            description: 'Install your first QA testing skill into Claude Code, Cursor, Copilot, or any AI coding agent in under 30 seconds.',
            totalTime: 'PT30S',
            tool: [
              { '@type': 'HowToTool', name: 'Node.js 18+' },
              { '@type': 'HowToTool', name: 'npx (comes with Node.js)' },
            ],
            step: [
              {
                '@type': 'HowToStep',
                position: 1,
                name: 'Choose your agent and pick a skill',
                text: 'Select the AI agent you use (Claude Code, Cursor, Copilot, etc.) and pick a starter skill from 450+ available options.',
              },
              {
                '@type': 'HowToStep',
                position: 2,
                name: 'Run the install command',
                text: 'Run npx @qaskills/cli add <skill-name> in your terminal. The CLI auto-detects your AI agent.',
              },
              {
                '@type': 'HowToStep',
                position: 3,
                name: 'Start using the skill',
                text: 'Open your AI agent and ask it to write tests. It now has expert-level QA knowledge from the installed skill.',
              },
            ],
          }),
        }}
      />
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Get Started in <span className="text-primary">30 Seconds</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Install your first QA testing skill into your AI agent. Choose from 450+ professional skills trusted by the testing community.
        </p>
      </div>

      {/* Prerequisites */}
      <Card className="mb-10 border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 pt-4 pb-4">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Prerequisites:</span> You need{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Node.js 18+</code>{' '}
            and{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">npx</code>{' '}
            available in your terminal.
          </p>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-8">
        <StepCard step={1} title="Choose your agent and pick a skill">
          <p className="text-sm text-muted-foreground mb-4">
            Select the AI agent you use and pick a starter skill. The install command updates
            automatically.
          </p>
          <SkillPicker />
        </StepCard>

        <StepCard step={2} title="Run the install command">
          <p className="text-sm text-muted-foreground">
            Copy the command above and run it in your terminal. The CLI automatically detects your
            agent and installs the skill to the right config directory.
          </p>
          <div className="mt-4 rounded-lg border border-border bg-muted/50 p-4 font-mono text-sm">
            <p className="text-green-400">$ npx @qaskills/cli add playwright-e2e</p>
            <p className="text-muted-foreground mt-1">✓ Detected agent: Claude Code</p>
            <p className="text-muted-foreground">✓ Downloading skill...</p>
            <p className="text-muted-foreground">✓ Installing to ~/.claude/commands</p>
            <p className="text-green-400">✓ Done! Skill installed successfully.</p>
          </div>
        </StepCard>

        <StepCard step={3} title="Verify it works">
          <p className="text-sm text-muted-foreground">
            Open your AI agent and ask it to write a test. It will now use the patterns and best
            practices from your installed skill. Try prompts like:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">→</span>
              <span>&quot;Write an E2E test for the login page using page objects&quot;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">→</span>
              <span>&quot;Create a test that checks accessibility on the homepage&quot;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">→</span>
              <span>&quot;Set up a performance test for the checkout flow&quot;</span>
            </li>
          </ul>
        </StepCard>
      </div>

      {/* Popular Skills Examples */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold mb-6">Popular Skill Examples</h2>
        <p className="text-muted-foreground mb-6">
          Quick installation examples for our most popular QA skills. Each skill is production-ready and battle-tested.
        </p>
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <code className="font-mono text-sm font-medium">npx @qaskills/cli add playwright-e2e</code>
              <Badge variant="secondary" className="text-xs">Web Testing</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Industry-standard E2E testing with Playwright. Includes page objects, visual regression, and accessibility patterns.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <code className="font-mono text-sm font-medium">npx @qaskills/cli add cypress-e2e</code>
              <Badge variant="secondary" className="text-xs">Web Testing</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Fast, reliable Cypress testing patterns. Real-time reloading, automatic waiting, and network stubbing.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <code className="font-mono text-sm font-medium">npx @qaskills/cli add axe-accessibility</code>
              <Badge variant="secondary" className="text-xs">Accessibility</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              WCAG 2.1 compliance testing with axe-core. Automated a11y checks for every component and page.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <code className="font-mono text-sm font-medium">npx @qaskills/cli add k6-performance</code>
              <Badge variant="secondary" className="text-xs">Performance</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Load testing with K6. Scenarios, thresholds, and cloud execution for production-grade performance tests.
            </p>
          </div>
        </div>
      </div>

      {/* Use Case Sections */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold mb-6">Skills by Use Case</h2>
        <div className="space-y-8">
          {/* Web & Browser Testing */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-lg font-semibold mb-3">Web Application Testing</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Comprehensive E2E testing for modern web applications with advanced patterns and best practices.
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">→</span>
                <code className="font-mono">npx @qaskills/cli add playwright-e2e</code>
                <span className="text-muted-foreground">— Multi-browser E2E testing</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">→</span>
                <code className="font-mono">npx @qaskills/cli add cypress-e2e</code>
                <span className="text-muted-foreground">— Fast developer-friendly testing</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">→</span>
                <code className="font-mono">npx @qaskills/cli add selenium-java</code>
                <span className="text-muted-foreground">— Enterprise Java automation</span>
              </div>
            </div>
          </div>

          {/* API Testing */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-lg font-semibold mb-3">API Testing & Contract Testing</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Validate APIs, microservices, and contract compliance with industry-standard tools.
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">→</span>
                <code className="font-mono">npx @qaskills/cli add playwright-api</code>
                <span className="text-muted-foreground">— Modern API testing with Playwright</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">→</span>
                <code className="font-mono">npx @qaskills/cli add postman-api</code>
                <span className="text-muted-foreground">— Postman collection automation</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">→</span>
                <code className="font-mono">npx @qaskills/cli add contract-testing-pact</code>
                <span className="text-muted-foreground">— Consumer-driven contract testing</span>
              </div>
            </div>
          </div>

          {/* Mobile Testing */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-lg font-semibold mb-3">Mobile Testing</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Cross-platform mobile test automation for iOS and Android applications.
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">→</span>
                <code className="font-mono">npx @qaskills/cli add appium-mobile</code>
                <span className="text-muted-foreground">— Native mobile app automation</span>
              </div>
            </div>
          </div>

          {/* Code Quality & Reviews */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-lg font-semibold mb-3">Code Quality & Documentation</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Improve test quality with structured approaches to bug reporting, test planning, and data generation.
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">→</span>
                <code className="font-mono">npx @qaskills/cli add bug-report-writing</code>
                <span className="text-muted-foreground">— Professional bug reporting standards</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">→</span>
                <code className="font-mono">npx @qaskills/cli add test-plan-generation</code>
                <span className="text-muted-foreground">— Comprehensive test planning</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">→</span>
                <code className="font-mono">npx @qaskills/cli add test-data-generation</code>
                <span className="text-muted-foreground">— Realistic test data creation</span>
              </div>
            </div>
          </div>

          {/* Performance & Security */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-lg font-semibold mb-3">Performance & Security Testing</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Load testing, performance benchmarking, and security vulnerability scanning.
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">→</span>
                <code className="font-mono">npx @qaskills/cli add k6-performance</code>
                <span className="text-muted-foreground">— Modern load testing</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">→</span>
                <code className="font-mono">npx @qaskills/cli add jmeter-load</code>
                <span className="text-muted-foreground">— Enterprise-grade performance testing</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">→</span>
                <code className="font-mono">npx @qaskills/cli add owasp-security</code>
                <span className="text-muted-foreground">— OWASP Top 10 security testing</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Examples */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold mb-6">Discover Skills with Search</h2>
        <p className="text-muted-foreground mb-6">
          Find the perfect skill for your testing needs with powerful search commands.
        </p>
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <code className="font-mono text-sm">npx @qaskills/cli search &quot;web testing&quot;</code>
            <p className="text-xs text-muted-foreground mt-2">Find all web and browser automation skills</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <code className="font-mono text-sm">npx @qaskills/cli search &quot;api&quot;</code>
            <p className="text-xs text-muted-foreground mt-2">Discover API testing and contract testing skills</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <code className="font-mono text-sm">npx @qaskills/cli search &quot;accessibility&quot;</code>
            <p className="text-xs text-muted-foreground mt-2">Find accessibility and WCAG compliance testing skills</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <code className="font-mono text-sm">npx @qaskills/cli search &quot;performance&quot;</code>
            <p className="text-xs text-muted-foreground mt-2">Load testing, stress testing, and performance benchmarking</p>
          </div>
        </div>
      </div>

      {/* CLI Reference */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold mb-6">CLI Commands</h2>
        <p className="text-muted-foreground mb-6">
          All the commands you need to manage your QA skills.
        </p>
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-sm text-muted-foreground">
                <th className="px-4 py-3 font-medium">Command</th>
                <th className="px-4 py-3 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {[
                { cmd: 'npx @qaskills/cli add <skill>', desc: 'Install a skill into your AI agent' },
                { cmd: 'npx @qaskills/cli remove <skill>', desc: 'Uninstall a skill from your AI agent' },
                { cmd: 'npx @qaskills/cli search <query>', desc: 'Search the skill directory' },
                { cmd: 'npx @qaskills/cli list', desc: 'List all installed skills' },
                { cmd: 'npx @qaskills/cli info <skill>', desc: 'Show details about a skill' },
                { cmd: 'npx @qaskills/cli update <skill>', desc: 'Update a skill to the latest version' },
                { cmd: 'npx @qaskills/cli init', desc: 'Initialize QASkills in your project' },
                { cmd: 'npx @qaskills/cli publish ./SKILL.md', desc: 'Publish your own skill to the directory' },
              ].map((row) => (
                <tr key={row.cmd} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {row.cmd}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Install globally for faster access:{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            npm i -g @qaskills/cli
          </code>{' '}
          then use <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">qaskills</code> instead of{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">npx @qaskills/cli</code>.
        </p>
      </div>

      {/* Why QASkills.sh */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold mb-6">Why Choose QASkills.sh?</h2>
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-sm font-medium">Feature</th>
                <th className="px-4 py-3 text-left text-sm font-medium">QASkills.sh</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Generic Skills</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-b border-border/50">
                <td className="px-4 py-3 font-medium">Focus</td>
                <td className="px-4 py-3 text-green-600">QA & Testing専門</td>
                <td className="px-4 py-3 text-muted-foreground">General purpose</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="px-4 py-3 font-medium">Quality Standards</td>
                <td className="px-4 py-3 text-green-600">Testing industry best practices</td>
                <td className="px-4 py-3 text-muted-foreground">Varies by author</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="px-4 py-3 font-medium">Coverage</td>
                <td className="px-4 py-3 text-green-600">E2E, API, Mobile, Performance, Security, A11y</td>
                <td className="px-4 py-3 text-muted-foreground">Limited testing tools</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="px-4 py-3 font-medium">Testing Patterns</td>
                <td className="px-4 py-3 text-green-600">Page Objects, BDD, TDD, Data-Driven</td>
                <td className="px-4 py-3 text-muted-foreground">Basic examples</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="px-4 py-3 font-medium">Agent Support</td>
                <td className="px-4 py-3 text-green-600">30+ AI agents</td>
                <td className="px-4 py-3 text-muted-foreground">Limited support</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Community</td>
                <td className="px-4 py-3 text-green-600">QA professionals & test engineers</td>
                <td className="px-4 py-3 text-muted-foreground">Mixed audience</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* What's Next */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold mb-6">What&apos;s next?</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            href="/skills"
            className="group rounded-lg border border-border bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:-translate-y-0.5"
          >
            <p className="font-medium group-hover:text-primary transition-colors">Browse Skills</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Explore 450+ curated QA skills for every testing need.
            </p>
          </Link>
          <Link
            href="/packs"
            className="group rounded-lg border border-border bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:-translate-y-0.5"
          >
            <p className="font-medium group-hover:text-primary transition-colors">Skill Packs</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Install bundles of related skills in one command.
            </p>
          </Link>
          <Link
            href="/leaderboard"
            className="group rounded-lg border border-border bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:-translate-y-0.5"
          >
            <p className="font-medium group-hover:text-primary transition-colors">Leaderboard</p>
            <p className="mt-1 text-sm text-muted-foreground">
              See the most popular and highest-quality skills.
            </p>
          </Link>
        </div>
      </div>

      {/* Final CTA */}
      <div className="mt-12 text-center">
        <Button size="lg" asChild>
          <Link href="/skills">
            Browse All Skills <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
