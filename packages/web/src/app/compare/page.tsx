import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { generateBreadcrumbJsonLd } from '@/lib/json-ld';
import { COMPARISONS } from '@/lib/compare-data';

export const metadata: Metadata = {
  title: 'Compare QA Tools & Skills',
  description:
    'Compare QA testing tools, frameworks, AI agents, and skill directories. Side-by-side feature matrices, code samples, pros/cons, and verdicts for 2026.',
  alternates: { canonical: 'https://qaskills.sh/compare' },
};

// Static curated comparisons kept for backward compatibility
const legacyComparisons = [
  {
    title: 'QASkills vs SkillsMP',
    slug: 'qaskills-vs-skillsmp',
    description:
      'Compare QA-focused curation vs general-purpose skill marketplace for AI agents.',
    category: 'Platform',
  },
  {
    title: 'Playwright vs Cypress Skills',
    slug: 'playwright-vs-cypress-skills',
    description: 'Compare Playwright and Cypress testing skills for AI coding agents.',
    category: 'Skills',
  },
];

// Group programmatic comparisons by category
const programmaticByCategory = COMPARISONS.reduce(
  (acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  },
  {} as Record<string, typeof COMPARISONS>
);

export default function CompareIndexPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            generateBreadcrumbJsonLd([
              { name: 'Home', url: 'https://qaskills.sh' },
              { name: 'Compare', url: 'https://qaskills.sh/compare' },
            ])
          ),
        }}
      />

      <div className="mb-10 text-center">
        <Badge variant="secondary" className="mb-3">
          Tool Comparisons
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Compare QA Tools &amp; Skills
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-muted-foreground">
          Side-by-side feature matrices, code samples, pros/cons, and verdicts for popular
          QA testing tools and AI coding agents in 2026.
        </p>
      </div>

      {/* Programmatic comparisons grouped by category */}
      {Object.entries(programmaticByCategory).map(([category, items]) => (
        <section key={category} className="mb-12">
          <h2 className="mb-4 text-xl font-bold">{category}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((c) => (
              <Link
                key={c.slug}
                href={`/compare/${c.slug}`}
                className="group block rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary"
              >
                <h3 className="font-semibold group-hover:text-primary">
                  {c.a.name} vs {c.b.name}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {c.description}
                </p>
                <span className="mt-2 inline-block text-sm text-primary">
                  Read comparison &rarr;
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {/* Legacy comparisons (kept for backward compat with existing routes) */}
      <section className="mb-12">
        <h2 className="mb-4 text-xl font-bold">Platform Comparisons</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {legacyComparisons.map((comp) => (
            <Link
              key={comp.slug}
              href={`/compare/${comp.slug}`}
              className="group block rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary"
            >
              <h3 className="font-semibold group-hover:text-primary">{comp.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{comp.description}</p>
              <span className="mt-2 inline-block text-sm text-primary">
                Read comparison &rarr;
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-12 rounded-lg border border-border bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Missing a comparison? Open an issue on{' '}
          <a
            href="https://github.com/PramodDutta/qaskills/issues"
            className="text-primary hover:underline"
          >
            GitHub
          </a>{' '}
          or browse our{' '}
          <Link href="/blog" className="text-primary hover:underline">
            500+ deep-dive blog articles
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
