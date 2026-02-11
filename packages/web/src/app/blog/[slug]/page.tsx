import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Metadata } from 'next';

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
npx qaskills add playwright-e2e
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
npx qaskills search
\`\`\`
`,
  },
};

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = posts[slug];
  if (!post) return { title: 'Post Not Found' };
  return { title: post.title, description: post.description };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = posts[slug];

  if (!post) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
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
