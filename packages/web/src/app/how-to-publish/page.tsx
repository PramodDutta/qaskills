import Link from 'next/link';
import { ArrowRight, FileCode, Upload, CheckCircle, BarChart3, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Publish a Skill',
  description:
    'Step-by-step guide to creating and publishing a QA skill on QASkills.sh. Learn the SKILL.md format, validation, and publishing workflow.',
};

const steps = [
  {
    step: 1,
    icon: FileCode,
    title: 'Create a SKILL.md file',
    description:
      'Every QA skill is a single SKILL.md file with YAML frontmatter and markdown instructions. Create a GitHub repository with your skill.',
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
    icon: CheckCircle,
    title: 'Validate your skill',
    description:
      'Use the QA Skills validator to check your SKILL.md against the schema. This ensures your frontmatter is correct and all required fields are present.',
    code: `npx @qaskills/skill-validator validate ./SKILL.md

# Output:
# ✓ Frontmatter is valid
# ✓ Name: My Playwright Skill
# ✓ Version: 1.0.0 (semver ✓)
# ✓ Testing types: e2e, visual
# ✓ Frameworks: playwright
# ✓ Agents: 3 supported
# ✓ Content length: 2,400 tokens
# ✓ All checks passed!`,
  },
  {
    step: 3,
    icon: Upload,
    title: 'Publish to QASkills.sh',
    description:
      'Use the CLI to publish your skill to the directory. You\'ll need to sign in with your QASkills.sh account first.',
    code: `# Sign in (opens browser)
npx @qaskills/cli login

# Publish from your skill repository
npx @qaskills/cli publish ./SKILL.md

# Output:
# ✓ Authenticated as your-username
# ✓ Validating SKILL.md...
# ✓ Publishing "My Playwright Skill" v1.0.0
# ✓ Published! View at qaskills.sh/skills/your-username/my-playwright-skill`,
  },
  {
    step: 4,
    icon: BarChart3,
    title: 'Track & improve',
    description:
      'Monitor your skill\'s performance in the dashboard. See install counts, quality scores, and community feedback. Update your skill by publishing new versions.',
    code: `# Update your skill
npx @qaskills/cli publish ./SKILL.md

# Output:
# ✓ Updated "My Playwright Skill" to v1.1.0
# ✓ 234 total installs | Quality score: 88/100`,
  },
];

const frontmatterFields = [
  { field: 'name', required: true, description: 'Display name of your skill' },
  { field: 'description', required: true, description: 'Short description (under 200 chars)' },
  { field: 'version', required: true, description: 'Semantic version (e.g. 1.0.0)' },
  { field: 'author', required: true, description: 'Your QASkills.sh username' },
  { field: 'license', required: true, description: 'License identifier (e.g. MIT, Apache-2.0)' },
  { field: 'tags', required: false, description: 'Keyword tags for discovery' },
  { field: 'testingTypes', required: true, description: 'e2e, unit, api, performance, security, etc.' },
  { field: 'frameworks', required: true, description: 'playwright, cypress, jest, pytest, etc.' },
  { field: 'languages', required: true, description: 'typescript, javascript, python, java, etc.' },
  { field: 'domains', required: false, description: 'web, mobile, api, etc.' },
  { field: 'agents', required: false, description: 'Supported agents (auto-detected if omitted)' },
  { field: 'minTokens', required: false, description: 'Minimum token count for the skill content' },
  { field: 'maxTokens', required: false, description: 'Maximum token count for the skill content' },
];

export default function HowToPublishPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-16">
        <Badge variant="secondary" className="mb-4">
          Publishing Guide
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          How to Publish a Skill
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Share your QA expertise with 27+ AI agents. Create a SKILL.md, validate it, and publish
          to the directory.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-12">
        {steps.map((s) => (
          <div key={s.step}>
            <div className="flex items-start gap-4 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                {s.step}
              </div>
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <s.icon className="h-5 w-5 text-primary" />
                  {s.title}
                </h2>
                <p className="mt-1 text-muted-foreground">{s.description}</p>
              </div>
            </div>
            <div className="ml-14">
              <pre className="rounded-lg border border-border bg-muted/50 p-4 text-sm overflow-x-auto">
                <code>{s.code}</code>
              </pre>
            </div>
          </div>
        ))}
      </div>

      {/* Frontmatter reference */}
      <div className="mt-20">
        <h2 className="text-2xl font-bold mb-6">SKILL.md Frontmatter Reference</h2>
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-sm text-muted-foreground">
                <th className="px-4 py-3 font-medium">Field</th>
                <th className="px-4 py-3 font-medium w-24">Required</th>
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
                    <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
                      {f.field}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    {f.required ? (
                      <Badge variant="default" className="text-xs">Required</Badge>
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
        <h2 className="text-2xl font-bold mb-6">Tips for a High Quality Score</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">Be specific and opinionated</h3>
              <p className="text-sm text-muted-foreground">
                Don&apos;t just restate documentation. Share real-world patterns, naming conventions,
                and project structure decisions.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">Include code examples</h3>
              <p className="text-sm text-muted-foreground">
                AI agents learn best from concrete examples. Show complete test files, not just
                snippets.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">Cover edge cases</h3>
              <p className="text-sm text-muted-foreground">
                Address common mistakes, anti-patterns, and gotchas. This is where expert knowledge
                shines.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">Keep it focused</h3>
              <p className="text-sm text-muted-foreground">
                One skill per concern. A Playwright E2E skill shouldn&apos;t also cover API testing —
                make separate skills instead.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-4">
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
  );
}
