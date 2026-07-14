import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpenCheck, Layers3, Route, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { generateBreadcrumbJsonLd, generateCollectionPageJsonLd } from '@/lib/json-ld';
import { getRoadmapItemCount, roadmaps } from './roadmap-data';

const canonicalUrl = 'https://qaskills.sh/roadmaps';
const description =
  'Explore interactive QA roadmaps for Playwright automation, JavaScript, TypeScript, AI testing, RAG, MCP, test engineering, and technical SEO.';

export const metadata: Metadata = {
  title: 'QA & Test Automation Roadmaps',
  description,
  keywords: [
    'QA roadmap',
    'test automation roadmap',
    'Playwright roadmap',
    'SDET learning path',
    'AI testing roadmap',
    'QA SEO roadmap',
  ],
  alternates: { canonical: canonicalUrl },
  openGraph: {
    type: 'website',
    url: canonicalUrl,
    title: 'Interactive QA & Test Automation Roadmaps',
    description,
    images: [
      {
        url: '/api/og?title=QA+%26+Test+Automation+Roadmaps&description=Interactive+learning+paths+for+modern+quality+engineering',
        width: 1200,
        height: 630,
        alt: 'QASkills interactive QA and test automation roadmaps',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Interactive QA & Test Automation Roadmaps',
    description,
    images: [
      '/api/og?title=QA+%26+Test+Automation+Roadmaps&description=Interactive+learning+paths+for+modern+quality+engineering',
    ],
  },
};

export default function RoadmapsPage() {
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Home', url: 'https://qaskills.sh' },
    { name: 'Roadmaps', url: canonicalUrl },
  ]);
  const collectionJsonLd = generateCollectionPageJsonLd({
    name: 'QASkills QA and Test Automation Roadmaps',
    description,
    url: canonicalUrl,
    items: roadmaps.map((roadmap) => ({
      name: roadmap.title,
      url: `${canonicalUrl}/${roadmap.slug}`,
    })),
  });

  return (
    <div className="overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <section className="relative border-b border-border bg-gradient-to-b from-primary/[0.08] via-background to-background">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <nav aria-label="Breadcrumb" className="mb-8 text-sm text-muted-foreground">
            <Link href="/" className="transition-colors hover:text-foreground">
              Home
            </Link>
            <span className="mx-2" aria-hidden="true">
              /
            </span>
            <span aria-current="page">Roadmaps</span>
          </nav>

          <div className="max-w-4xl">
            <Badge
              variant="secondary"
              className="mb-5 gap-1.5 border border-primary/15 bg-primary/10 text-primary"
            >
              <Route className="h-3.5 w-3.5" />
              Interactive learning paths
            </Badge>
            <h1 className="text-balance text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              QA &amp; Test Automation Roadmaps
            </h1>
            <p className="mt-6 max-w-3xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
              Choose a structured QA roadmap, follow the phases in order, and check off practical
              milestones as you learn. Each path connects concepts to deep technical guides and
              installable QASkills, while progress stays private in your browser.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Start here</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Available roadmaps</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            The section uses one reusable roadmap format, so new learning paths can be added without
            redesigning the experience.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {roadmaps.map((roadmap) => (
            <Link
              key={roadmap.slug}
              href={`/roadmaps/${roadmap.slug}`}
              className="group relative flex min-h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl sm:p-8"
              data-testid={`roadmap-card-${roadmap.slug}`}
            >
              <div
                aria-hidden="true"
                className="absolute right-0 top-0 h-36 w-36 rounded-bl-full bg-primary/[0.06] transition-transform group-hover:scale-110"
              />
              <div className="relative flex flex-wrap items-center gap-2">
                {roadmap.featured ? <Badge>Featured</Badge> : null}
                <Badge variant="outline">{roadmap.duration}</Badge>
              </div>

              <div className="relative mt-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  {roadmap.eyebrow}
                </p>
                <h2 className="mt-2 text-2xl font-bold leading-tight tracking-tight transition-colors group-hover:text-primary sm:text-3xl">
                  {roadmap.shortTitle}
                </h2>
                <p className="mt-4 text-base leading-7 text-muted-foreground">
                  {roadmap.description}
                </p>
              </div>

              <dl className="relative mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {roadmap.stats.map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-border bg-muted/35 p-3">
                    <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                    <dd className="mt-1 text-lg font-black tracking-tight">{stat.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="relative mt-7 flex-1 border-t border-border pt-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Phase preview
                </p>
                <ol className="grid gap-2 sm:grid-cols-2">
                  {roadmap.phases.slice(0, 4).map((phase) => (
                    <li key={phase.id} className="flex items-center gap-2 text-sm">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                        {phase.number}
                      </span>
                      <span className="line-clamp-1 text-muted-foreground">{phase.title}</span>
                    </li>
                  ))}
                </ol>
                {roadmap.phases.length > 4 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    + {roadmap.phases.length - 4} more topic clusters
                  </p>
                ) : null}
              </div>

              <div className="relative mt-7 flex items-center justify-between border-t border-border pt-5">
                <span className="text-sm text-muted-foreground">
                  {getRoadmapItemCount(roadmap)} interactive milestones
                </span>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  Open roadmap
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-14 sm:px-6 md:grid-cols-3 lg:px-8">
          {[
            {
              icon: Route,
              title: 'Ordered learning',
              description:
                'Every roadmap makes prerequisites, sequence, milestones, and outcomes explicit.',
            },
            {
              icon: BookOpenCheck,
              title: 'Practical resources',
              description:
                'Milestones link to detailed guides and skills when a deeper reference is useful.',
            },
            {
              icon: Layers3,
              title: 'Built to expand',
              description:
                'Future QA, SDET, API, performance, security, and AI roadmaps use the same system.',
            },
          ].map(({ icon: Icon, title, description: itemDescription }) => (
            <div key={title} className="rounded-xl border border-border bg-background p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{itemDescription}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <Sparkles className="mx-auto h-6 w-6 text-primary" />
        <h2 className="mt-4 text-2xl font-bold tracking-tight">
          Turn the roadmap into working skills
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Browse curated skills for Playwright, API testing, accessibility, performance, security,
          AI evaluation, and more than 30 coding agents.
        </p>
        <Link
          href="/skills"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Browse QA skills
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
