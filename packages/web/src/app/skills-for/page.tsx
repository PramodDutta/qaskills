import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { generateBreadcrumbJsonLd } from '@/lib/json-ld';
import { HUBS } from '@/lib/skills-for-hubs';

export const metadata: Metadata = {
  title: 'Skills For — Keyword-Targeted Hubs',
  description:
    'Browse QA testing skills by AI agent (Claude Code, Cursor, Copilot, Windsurf) and by topic (LLM evals, MCP). One command install via npx qaskills add.',
  alternates: { canonical: 'https://qaskills.sh/skills-for' },
};

export default function SkillsForIndexPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            generateBreadcrumbJsonLd([
              { name: 'Home', url: 'https://qaskills.sh' },
              { name: 'Skills For', url: 'https://qaskills.sh/skills-for' },
            ])
          ),
        }}
      />

      <div className="mb-10 text-center">
        <Badge variant="secondary" className="mb-3">
          Skills Hubs
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Skills For — Keyword-Targeted Hubs
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-muted-foreground">
          Curated landings for each AI agent and testing topic. Install any skill in 5
          seconds with <code className="rounded bg-muted px-1.5 py-0.5 text-sm">npx qaskills add</code>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {HUBS.map((h) => (
          <Link
            key={h.slug}
            href={`/skills-for/${h.slug}`}
            className="group block rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary"
          >
            <h2 className="font-semibold group-hover:text-primary">{h.h1}</h2>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {h.description}
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm text-primary">
              Browse hub <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-12 rounded-lg border border-border bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Looking for a different topic? Browse{' '}
          <Link href="/skills" className="text-primary hover:underline">
            all 500+ skills
          </Link>{' '}
          or{' '}
          <Link href="/categories" className="text-primary hover:underline">
            categories
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
