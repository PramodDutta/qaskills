import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Metadata } from 'next';
import { generateBlogPostJsonLd } from '@/lib/json-ld';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

const posts: Record<string, { title: string; description: string; date: string; category: string; content: string }> = {
  'introducing-qaskills': {
    title: 'Introducing QA Skills — Agent Skills for Testing',
    description: 'Why we built the first QA-specific skills directory for AI coding agents.',
    date: '2026-02-10',
    category: 'Announcement',
    content: `
Among 49,000+ skills indexed on existing agent skill platforms, only a handful are dedicated to QA testing. We saw an opportunity.

## The Problem

AI coding agents like Claude Code, Cursor, and Copilot are incredibly powerful general-purpose tools. But when it comes to QA testing, they lack the specialized knowledge that experienced test engineers bring:

- **Framework-specific patterns**: Page Object Model for Playwright, custom commands for Cypress, fixtures for pytest
- **Testing strategy**: When to use E2E vs integration vs unit tests
- **Best practices**: Proper assertions, test isolation, flaky test prevention

## The Solution

QA Skills is a curated directory of testing-specific skills that you can install into any AI coding agent with a single command:

\`\`\`bash
npx @qaskills/cli add playwright-e2e
\`\`\`

This installs expert Playwright knowledge into your AI agent. Now when you ask it to write tests, it follows proven patterns and best practices.

## What's Available

We're launching with 20 curated skills covering:

- **E2E Testing**: Playwright, Cypress, Selenium
- **API Testing**: REST Assured, Postman, Playwright API
- **Performance**: k6, JMeter
- **Security**: OWASP patterns
- **And more**: Accessibility, visual regression, contract testing, BDD

## Get Started

Browse our skills directory at [qaskills.sh/skills](/skills) or install one now:

\`\`\`bash
npx @qaskills/cli search
\`\`\`
`,
  },
  'playwright-e2e-best-practices': {
    title: 'Playwright E2E Best Practices for AI Agents',
    description: 'How our Playwright E2E skill teaches AI agents to write robust, maintainable end-to-end tests.',
    date: '2026-02-08',
    category: 'Tutorial',
    content: `
Writing E2E tests that are fast, reliable, and maintainable is hard. Teaching an AI agent to do it well is even harder. Here's how the Playwright E2E skill approaches this challenge.

## Page Object Model

The skill teaches AI agents to always use the Page Object Model pattern. Instead of writing raw selectors in tests, it creates reusable page classes:

\`\`\`bash
npx @qaskills/cli add playwright-e2e
\`\`\`

Once installed, your AI agent structures every test with proper page objects, separating selectors from test logic.

## Auto-Waiting Locators

One of the most common mistakes in E2E testing is using fragile selectors and manual waits. The skill teaches agents to use Playwright's built-in auto-waiting locators like \`getByRole\`, \`getByText\`, and \`getByTestId\` instead of raw CSS selectors.

## Fixture-Based Setup

The skill guides agents to use Playwright's fixture system for test setup and teardown. This ensures tests are isolated and don't share state, which prevents flaky failures.

## Cross-Browser Testing

The skill includes patterns for configuring tests to run across Chromium, Firefox, and WebKit, with proper browser-specific handling when needed.

## What You Get

After installing the Playwright E2E skill:

- **Consistent patterns**: Every test follows the same structure
- **Better selectors**: Accessible, resilient locator strategies
- **Proper assertions**: Using Playwright's built-in expect assertions
- **Test isolation**: Each test runs independently with proper fixtures

Try it yourself:

\`\`\`bash
npx @qaskills/cli add playwright-e2e
\`\`\`
`,
  },
  'ai-agents-qa-revolution': {
    title: 'The AI Agent Revolution in QA Testing',
    description: 'How AI coding agents are transforming QA, and why they need specialized testing knowledge.',
    date: '2026-02-05',
    category: 'Industry',
    content: `
AI coding agents are changing how software gets built. But QA testing presents unique challenges that generic AI knowledge can't solve well. Here's why specialized QA skills matter.

## The State of AI in QA

AI agents can now write code, debug issues, and refactor applications with impressive accuracy. But when asked to write tests, they often produce:

- **Brittle selectors**: Using IDs and CSS paths that break on every UI change
- **Missing edge cases**: Only testing the happy path
- **Poor test structure**: Mixing setup, action, and assertion without clear separation
- **No test strategy**: Writing E2E tests where unit tests would suffice

## Why Specialized Knowledge Matters

A senior QA engineer brings years of hard-won knowledge about testing patterns, framework idioms, and testing strategy. This knowledge can't be learned from reading documentation alone — it comes from real-world experience debugging flaky tests, scaling test suites, and building reliable CI pipelines.

## The Skills Approach

QA Skills bridges this gap by encoding expert QA knowledge into installable skills. When you install a skill like \`playwright-e2e\`, your AI agent gains:

- **Framework expertise**: Deep knowledge of Playwright APIs, patterns, and idioms
- **Testing patterns**: Page Object Model, fixtures, factory patterns, and more
- **Strategy guidance**: When to use which testing approach
- **Best practices**: From real-world test suites and QA teams

## The Future

We believe the future of QA is AI agents augmented with specialized testing knowledge. Not replacing QA engineers, but amplifying their expertise across entire organizations.

## Try It Now

Give your AI agent QA superpowers:

\`\`\`bash
npx @qaskills/cli add playwright-e2e
\`\`\`

Browse all 20+ skills at [qaskills.sh/skills](/skills).
`,
  },
};

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = posts[slug];
  if (!post) return { title: 'Post Not Found' };

  const ogImageUrl = `/api/og?title=${encodeURIComponent(post.title)}&description=${encodeURIComponent(post.description)}`;

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: `${post.title} | QASkills.sh`,
      description: post.description,
      url: `https://qaskills.sh/blog/${slug}`,
      type: 'article',
      publishedTime: post.date,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [ogImageUrl],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = posts[slug];

  if (!post) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            generateBlogPostJsonLd({
              title: post.title,
              description: post.description,
              date: post.date,
              slug,
            }),
          ),
        }}
      />

      <Link href="/blog" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="h-4 w-4" /> Back to Blog
      </Link>

      <article>
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary">{post.category}</Badge>
            <span className="text-sm text-muted-foreground">{post.date}</span>
          </div>
          <h1 className="text-4xl font-bold">{post.title}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{post.description}</p>
        </div>

        <div className="prose dark:prose-invert max-w-none">
          {post.content.split('\n\n').map((paragraph, i) => {
            if (paragraph.startsWith('## ')) {
              return <h2 key={i}>{paragraph.replace('## ', '')}</h2>;
            }
            if (paragraph.startsWith('```')) {
              const lines = paragraph.split('\n');
              const code = lines.slice(1, -1).join('\n');
              return <pre key={i}><code>{code}</code></pre>;
            }
            if (paragraph.startsWith('- ')) {
              return (
                <ul key={i}>
                  {paragraph.split('\n').map((li, j) => (
                    <li key={j}>{li.replace(/^- \*\*(.+?)\*\*: /, '$1: ').replace(/^- /, '')}</li>
                  ))}
                </ul>
              );
            }
            return <p key={i}>{paragraph}</p>;
          })}
        </div>
      </article>
    </div>
  );
}
