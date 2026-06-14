import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CheckCircle2, AlertCircle, HelpCircle, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  generateBreadcrumbJsonLd,
  generateFAQJsonLd,
} from '@/lib/json-ld';
import {
  findComparison,
  allComparisonSlugs,
  type CompareEntry,
} from '@/lib/compare-data';

interface CompareSlugPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return allComparisonSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: CompareSlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = findComparison(slug);
  if (!entry) return { title: 'Comparison Not Found' };

  const url = `https://qaskills.sh/compare/${slug}`;
  return {
    title: entry.title,
    description: entry.description,
    alternates: { canonical: url },
    openGraph: {
      title: entry.title,
      description: entry.description,
      url,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: entry.title,
      description: entry.description,
    },
  };
}

function CompareSchema({ entry, url }: { entry: CompareEntry; url: string }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            generateBreadcrumbJsonLd([
              { name: 'Home', url: 'https://qaskills.sh' },
              { name: 'Compare', url: 'https://qaskills.sh/compare' },
              { name: `${entry.a.name} vs ${entry.b.name}`, url },
            ])
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: entry.title,
            description: entry.description,
            url,
            author: {
              '@type': 'Person',
              name: 'Pramod Dutta',
              url: 'https://youtube.com/@TheTestingAcademy',
            },
            publisher: {
              '@type': 'Organization',
              name: 'QASkills.sh',
              url: 'https://qaskills.sh',
              logo: {
                '@type': 'ImageObject',
                url: 'https://qaskills.sh/logo.svg',
                width: 512,
                height: 512,
              },
            },
            mainEntityOfPage: url,
            about: [entry.a.name, entry.b.name],
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQJsonLd(entry.faqs)) }}
      />
    </>
  );
}

function ToolHeader({ tool, label }: { tool: CompareEntry['a']; label: 'A' | 'B' }) {
  const color =
    label === 'A'
      ? 'border-blue-500/40 bg-blue-500/5'
      : 'border-emerald-500/40 bg-emerald-500/5';
  return (
    <Card className={color}>
      <CardContent className="pt-6">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="secondary">Tool {label}</Badge>
          <span className="text-xs text-muted-foreground">
            {tool.firstRelease} · {tool.creator}
          </span>
        </div>
        <h2 className="text-2xl font-bold">{tool.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{tool.tagline}</p>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-muted-foreground">License</dt>
            <dd className="font-medium">{tool.license}</dd>
          </div>
          {tool.language && (
            <div>
              <dt className="text-muted-foreground">Language</dt>
              <dd className="font-medium">{tool.language}</dd>
            </div>
          )}
        </dl>
        {tool.installCmd && (
          <pre className="mt-3 overflow-x-auto rounded-md border border-border bg-background p-2 text-xs">
            <code>{tool.installCmd}</code>
          </pre>
        )}
        {tool.skillSlug && (
          <Link
            href={`/skills`}
            className="mt-2 inline-block text-xs text-primary hover:underline"
          >
            Browse {tool.name} skills →
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

export default async function ComparePage({ params }: CompareSlugPageProps) {
  const { slug } = await params;
  const entry = findComparison(slug);
  if (!entry) notFound();

  const url = `https://qaskills.sh/compare/${slug}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <CompareSchema entry={entry} url={url} />

      {/* Hero */}
      <div className="mb-10">
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/compare" className="hover:text-foreground">
            Compare
          </Link>
          <span>/</span>
          <Badge variant="outline">{entry.category}</Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{entry.title}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{entry.description}</p>
      </div>

      {/* Tool headers */}
      <div className="mb-12 grid gap-4 md:grid-cols-2">
        <ToolHeader tool={entry.a} label="A" />
        <ToolHeader tool={entry.b} label="B" />
      </div>

      {/* Intro */}
      <div className="mb-12">
        <p className="text-base leading-relaxed text-muted-foreground">{entry.intro}</p>
      </div>

      {/* Matrix */}
      <div className="mb-12">
        <h2 className="mb-4 text-2xl font-bold">Feature-by-Feature Comparison</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-sm">
                <th className="px-4 py-3 font-medium">Feature</th>
                <th className="px-4 py-3 font-medium">{entry.a.name}</th>
                <th className="px-4 py-3 font-medium">{entry.b.name}</th>
              </tr>
            </thead>
            <tbody>
              {entry.matrix.map((row) => (
                <tr key={row.feature} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3 text-sm font-medium">{row.feature}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{row.a}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{row.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pros / Cons */}
      <div className="mb-12 grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <CheckCircle2 className="h-5 w-5 text-blue-500" />
              Strengths of {entry.a.name}
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {entry.prosA.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="mt-0.5 text-blue-500">•</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Strengths of {entry.b.name}
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {entry.prosB.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="mt-0.5 text-emerald-500">•</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* When to use each */}
      <div className="mb-12 grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-3 text-lg font-semibold">When to pick {entry.a.name}</h3>
            <p className="text-sm text-muted-foreground">{entry.whenA}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-3 text-lg font-semibold">When to pick {entry.b.name}</h3>
            <p className="text-sm text-muted-foreground">{entry.whenB}</p>
          </CardContent>
        </Card>
      </div>

      {/* Code samples */}
      {(entry.codeA || entry.codeB) && (
        <div className="mb-12">
          <h2 className="mb-4 text-2xl font-bold">Code Side-by-Side</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {entry.codeA && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">{entry.a.name}</h3>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 text-xs">
                  <code>{entry.codeA.code}</code>
                </pre>
              </div>
            )}
            {entry.codeB && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">{entry.b.name}</h3>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 text-xs">
                  <code>{entry.codeB.code}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Verdict */}
      <Card className="mb-12 border-primary/40 bg-primary/5">
        <CardContent className="pt-6">
          <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold">
            <Award className="h-6 w-6 text-primary" />
            Verdict
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">{entry.verdict}</p>
        </CardContent>
      </Card>

      {/* FAQ */}
      <div className="mb-12">
        <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
          <HelpCircle className="h-6 w-6 text-primary" />
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {entry.faqs.map((f) => (
            <Card key={f.q}>
              <CardContent className="pt-6">
                <h3 className="mb-2 font-semibold">{f.q}</h3>
                <p className="text-sm text-muted-foreground">{f.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Related blogs */}
      {entry.relatedBlogs && entry.relatedBlogs.length > 0 && (
        <div className="mb-12">
          <h2 className="mb-4 text-2xl font-bold">Deep-Dive Articles</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {entry.relatedBlogs.map((blogSlug) => (
              <Link
                key={blogSlug}
                href={`/blog/${blogSlug}`}
                className="group flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
              >
                <span className="text-sm font-medium">{blogSlug.replace(/-/g, ' ')}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <h2 className="text-2xl font-bold">Need a ready-made testing skill?</h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Both {entry.a.name} and {entry.b.name} have curated QASkills.sh skills you can
          install into Claude Code, Cursor, Copilot in 5 seconds.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/skills">Browse 500+ Skills</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/compare">More Comparisons</Link>
          </Button>
        </div>
      </div>

      {/* Warning footer */}
      <p className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <AlertCircle className="h-3 w-3" />
        Comparisons reflect public information as of 2026-05. Tooling evolves quickly —
        verify current state on official docs before final decisions.
      </p>
    </div>
  );
}
