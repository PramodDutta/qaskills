import Link from 'next/link';
import {
  ArrowRight,
  FileCode,
  Upload,
  CheckCircle,
  BarChart3,
  Terminal,
  Zap,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Publish a Skill on QASkills.sh — 2-Minute Guide',
  description:
    'Publish your QA skill to qaskills.sh in 4 steps. Copy-paste SKILL.md template, run npx qaskills publish, and ship to 30+ AI coding agents.',
  alternates: { canonical: 'https://qaskills.sh/how-to-publish' },
  openGraph: {
    title: 'How to Publish a Skill on QASkills.sh',
    description:
      'Step-by-step guide: write SKILL.md, validate, publish, track installs. Reach 30+ AI agents in 2 minutes.',
    type: 'article',
    url: 'https://qaskills.sh/how-to-publish',
  },
};

const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Publish a Skill on QASkills.sh',
  description:
    'Step-by-step guide to publishing a QA skill on qaskills.sh so it can be installed by 30+ AI coding agents.',
  totalTime: 'PT2M',
  tool: ['Node.js >= 20', '@qaskills/cli', '@qaskills/skill-validator'],
  step: [
    {
      '@type': 'HowToStep',
      name: 'Create SKILL.md',
      text: 'Create a SKILL.md file with YAML frontmatter (name, description, version, tags, frameworks, languages, agents) and markdown instructions for AI agents.',
      url: 'https://qaskills.sh/how-to-publish#step-1',
    },
    {
      '@type': 'HowToStep',
      name: 'Validate',
      text: 'Run npx @qaskills/skill-validator validate ./SKILL.md to check schema compliance.',
      url: 'https://qaskills.sh/how-to-publish#step-2',
    },
    {
      '@type': 'HowToStep',
      name: 'Publish',
      text: 'Run npx @qaskills/cli login then npx @qaskills/cli publish ./SKILL.md to ship.',
      url: 'https://qaskills.sh/how-to-publish#step-3',
    },
    {
      '@type': 'HowToStep',
      name: 'Track',
      text: 'View install counts, quality score, and community reviews in your dashboard.',
      url: 'https://qaskills.sh/how-to-publish#step-4',
    },
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How long does it take to publish a skill?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Under 2 minutes once your SKILL.md is written. The CLI handles validation, upload, and indexing. Skills appear on qaskills.sh within 30 seconds of successful publish.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do I need a GitHub repository?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. You can publish a single SKILL.md file from anywhere on disk. A GitHub repo helps with version control, contributor tracking, and the install fallback chain.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is publishing free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Publishing is and always will be free for open-source MIT/Apache-licensed skills. Premium paid skills require a creator account.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which AI agents support QASkills.sh skills?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '30+ agents including Claude Code, Cursor, GitHub Copilot, Windsurf, Cline, Codex, Aider, Continue, Zed, Bolt, Gemini CLI, Amp. The CLI auto-detects installed agents and installs to the correct config paths.',
      },
    },
    {
      '@type': 'Question',
      name: 'How is the quality score calculated?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A weighted score from: install count (30%), retention (25%), review rating (20%), content depth tokens (15%), update recency (10%). Score 80+ surfaces in the homepage leaderboard.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I update a published skill?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Bump version in frontmatter and re-run publish. All installed copies get notified of the update via the agent telemetry channel.',
      },
    },
  ],
};

const steps = [
  {
    step: 1,
    id: 'step-1',
    icon: FileCode,
    title: 'Create a SKILL.md file',
    description:
      'Every QA skill is a single SKILL.md file with YAML frontmatter and markdown instructions. Create a GitHub repository with your skill or keep it local.',
    code: `---
name: My Playwright Skill
description: Custom Playwright patterns for my team
version: 1.0.0
author: your-username
license: MIT
tags: [playwright, e2e, testing]
testingTypes: [e2e, visual]
frameworks: [playwright]
languages: [typescript, javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot]
---

# My Playwright Skill

## Instructions

When writing Playwright tests, follow these patterns:

- Always use Page Object Model
- Use \`getByRole\` and \`getByTestId\` locators
- Write fixtures for test setup
...`,
  },
  {
    step: 2,
    id: 'step-2',
    icon: CheckCircle,
    title: 'Validate your skill',
    description:
      'Use the QA Skills validator to check your SKILL.md against the schema. This ensures your frontmatter is correct and all required fields are present.',
    code: `npx @qaskills/skill-validator validate ./SKILL.md

# Output:
# Frontmatter is valid
# Name: My Playwright Skill
# Version: 1.0.0 (semver ok)
# Testing types: e2e, visual
# Frameworks: playwright
# Agents: 3 supported
# Content length: 2,400 tokens
# All checks passed`,
  },
  {
    step: 3,
    id: 'step-3',
    icon: Upload,
    title: 'Publish to QASkills.sh',
    description:
      "Use the CLI to publish your skill to the directory. You'll need to sign in with your QASkills.sh account first.",
    code: `# Sign in (opens browser)
npx @qaskills/cli login

# Publish from your skill repository
npx @qaskills/cli publish ./SKILL.md

# Output:
# Authenticated as your-username
# Validating SKILL.md...
# Publishing "My Playwright Skill" v1.0.0
# Published! View at qaskills.sh/skills/your-username/my-playwright-skill`,
  },
  {
    step: 4,
    id: 'step-4',
    icon: BarChart3,
    title: 'Track & improve',
    description:
      "Monitor your skill's performance in the dashboard. See install counts, quality scores, and community feedback. Update your skill by publishing new versions.",
    code: `# Update your skill (bump version in frontmatter first)
npx @qaskills/cli publish ./SKILL.md

# Output:
# Updated "My Playwright Skill" to v1.1.0
# 234 total installs | Quality score: 88/100`,
  },
];

const frontmatterFields = [
  { field: 'name', required: true, description: 'Display name of your skill (1-100 chars)' },
  {
    field: 'description',
    required: true,
    description: 'Short description (10-500 chars)',
  },
  { field: 'version', required: true, description: 'Semantic version (e.g. 1.0.0)' },
  { field: 'author', required: true, description: 'Your QASkills.sh username' },
  { field: 'license', required: true, description: 'License identifier (e.g. MIT, Apache-2.0)' },
  { field: 'tags', required: false, description: 'Keyword tags for discovery' },
  {
    field: 'testingTypes',
    required: true,
    description: 'e2e, unit, api, performance, security, etc.',
  },
  {
    field: 'frameworks',
    required: false,
    description: 'playwright, cypress, jest, pytest, etc.',
  },
  {
    field: 'languages',
    required: true,
    description: 'typescript, javascript, python, java, etc.',
  },
  { field: 'domains', required: false, description: 'web, mobile, api, etc.' },
  {
    field: 'agents',
    required: false,
    description: 'Supported agents (auto-detected if omitted)',
  },
];

const faqs = [
  {
    q: 'How long does it take to publish a skill?',
    a: 'Under 2 minutes once your SKILL.md is written. CLI handles validation, upload, and indexing. Skill appears on qaskills.sh within 30 seconds.',
  },
  {
    q: 'Do I need a GitHub repository?',
    a: 'No. Publish a single SKILL.md from anywhere on disk. A GitHub repo helps with version control and the install fallback chain.',
  },
  {
    q: 'Is publishing free?',
    a: 'Yes. Free for open-source MIT/Apache-licensed skills. Premium paid skills require a creator account.',
  },
  {
    q: 'Which AI agents support QASkills.sh skills?',
    a: '30+ agents: Claude Code, Cursor, GitHub Copilot, Windsurf, Cline, Codex, Aider, Continue, Zed, Bolt, Gemini CLI, Amp, and more. CLI auto-detects installed agents.',
  },
  {
    q: 'How is the quality score calculated?',
    a: 'Weighted from install count (30%), retention (25%), review rating (20%), content depth (15%), update recency (10%). Score 80+ surfaces on leaderboard.',
  },
  {
    q: 'Can I update a published skill?',
    a: 'Yes. Bump version in frontmatter, run publish again. All installed copies get update notifications.',
  },
];

const troubleshooting = [
  {
    issue: 'npx command not found',
    fix: 'Install Node.js >= 20 from nodejs.org. npm ships with Node.',
  },
  {
    issue: 'Validation fails: "name too long"',
    fix: 'Title must be 1-100 characters. Shorten or split into multiple skills.',
  },
  {
    issue: 'Login opens browser but never returns',
    fix: 'Allow popups for qaskills.sh. If headless, use --token flag with a personal access token from /dashboard/tokens.',
  },
  {
    issue: 'Publish hangs',
    fix: 'Check QASKILLS_API_URL env var. Default is https://qaskills.sh. Network behind proxy needs HTTPS_PROXY set.',
  },
];

export default function HowToPublishPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <Badge variant="secondary" className="mb-4">
            Publishing Guide
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            How to Publish a Skill
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Ship your QA expertise to 30+ AI agents in 2 minutes. Create a SKILL.md,
            validate, publish.
          </p>
        </div>

        {/* TL;DR — quick answer box */}
        <Card className="mb-12 border-primary/40 bg-primary/5">
          <CardContent className="pt-6">
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">TL;DR — Publish in 30 seconds</h2>
            </div>
            <pre className="overflow-x-auto rounded-md border border-border bg-background p-4 text-sm">
              <code>{`# 1. Create SKILL.md (see template below)
# 2. Validate
npx @qaskills/skill-validator validate ./SKILL.md

# 3. Login + publish
npx @qaskills/cli login
npx @qaskills/cli publish ./SKILL.md

# Done! View at qaskills.sh/skills/<username>/<slug>`}</code>
            </pre>
            <p className="mt-3 text-sm text-muted-foreground">
              Need detail? Scroll for the full walkthrough, frontmatter reference, FAQ,
              and troubleshooting.
            </p>
          </CardContent>
        </Card>

        {/* Steps */}
        <div className="space-y-12">
          {steps.map((s) => (
            <div key={s.step} id={s.id}>
              <div className="mb-4 flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {s.step}
                </div>
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-semibold">
                    <s.icon className="h-5 w-5 text-primary" />
                    {s.title}
                  </h2>
                  <p className="mt-1 text-muted-foreground">{s.description}</p>
                </div>
              </div>
              <div className="ml-14">
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/50 p-4 text-sm">
                  <code>{s.code}</code>
                </pre>
              </div>
            </div>
          ))}
        </div>

        {/* Frontmatter reference */}
        <div className="mt-20">
          <h2 className="mb-6 text-2xl font-bold">SKILL.md Frontmatter Reference</h2>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Field</th>
                  <th className="w-24 px-4 py-3 font-medium">Required</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {frontmatterFields.map((f) => (
                  <tr
                    key={f.field}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
                        {f.field}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      {f.required ? (
                        <Badge variant="default" className="text-xs">
                          Required
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">Optional</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {f.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-16">
          <h2 className="mb-6 text-2xl font-bold">Tips for a High Quality Score</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <h3 className="mb-2 font-semibold">Be specific and opinionated</h3>
                <p className="text-sm text-muted-foreground">
                  Don&apos;t just restate documentation. Share real-world patterns, naming
                  conventions, and project structure decisions.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="mb-2 font-semibold">Include code examples</h3>
                <p className="text-sm text-muted-foreground">
                  AI agents learn best from concrete examples. Show complete test files,
                  not just snippets.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="mb-2 font-semibold">Cover edge cases</h3>
                <p className="text-sm text-muted-foreground">
                  Address common mistakes, anti-patterns, and gotchas. This is where
                  expert knowledge shines.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="mb-2 font-semibold">Keep it focused</h3>
                <p className="text-sm text-muted-foreground">
                  One skill per concern. A Playwright E2E skill shouldn&apos;t also cover
                  API testing — make separate skills instead.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
            <HelpCircle className="h-6 w-6 text-primary" />
            Frequently Asked Questions
          </h2>
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

        {/* Troubleshooting */}
        <div className="mt-16">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            Troubleshooting
          </h2>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Issue</th>
                  <th className="px-4 py-3 font-medium">Fix</th>
                </tr>
              </thead>
              <tbody>
                {troubleshooting.map((t) => (
                  <tr key={t.issue} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3">
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
                        {t.issue}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{t.fix}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* See examples */}
        <div className="mt-16">
          <h2 className="mb-6 text-2xl font-bold">See Real Published Skills</h2>
          <p className="mb-4 text-muted-foreground">
            Learn from skills already on the directory. Each one follows the same
            SKILL.md format you&apos;re writing now.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href="/skills/thetestingacademy/playwright-e2e">
                Playwright E2E
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/skills">Browse 450+ Skills</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/blog/how-to-write-high-quality-qa-skills">
                Writing Guide
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/blog/skill-md-format-guide">SKILL.md Format Guide</Link>
            </Button>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/dashboard/publish">
              Publish Your Skill <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/skills">
              <Terminal className="h-4 w-4" /> Browse Existing Skills
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}
