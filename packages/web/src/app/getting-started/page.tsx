import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Get Started in <span className="text-primary">30 Seconds</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Install your first QA testing skill into your AI agent.
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
              Explore 20+ curated QA skills for every testing need.
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
