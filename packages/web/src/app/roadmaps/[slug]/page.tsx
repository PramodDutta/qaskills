import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  Gauge,
  Route,
  Target,
  Users,
} from 'lucide-react';
import { RoadmapExplorer } from '@/components/roadmaps/roadmap-explorer';
import { Badge } from '@/components/ui/badge';
import { generateBreadcrumbJsonLd, generateFAQJsonLd, generateHowToJsonLd } from '@/lib/json-ld';
import { getRoadmapBySlug, getRoadmapItemCount, roadmaps } from '../roadmap-data';

interface RoadmapPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return roadmaps.map((roadmap) => ({ slug: roadmap.slug }));
}

export async function generateMetadata({ params }: RoadmapPageProps): Promise<Metadata> {
  const { slug } = await params;
  const roadmap = getRoadmapBySlug(slug);
  if (!roadmap) return {};

  const canonicalUrl = `https://qaskills.sh/roadmaps/${roadmap.slug}`;
  const socialImage = `/api/og?title=${encodeURIComponent(roadmap.shortTitle)}&description=${encodeURIComponent(roadmap.description)}`;

  return {
    title: roadmap.metadataTitle,
    description: roadmap.description,
    keywords: roadmap.keywords,
    authors: [{ name: 'Pramod Dutta', url: 'https://youtube.com/@TheTestingAcademy' }],
    category: 'Education',
    alternates: { canonical: canonicalUrl },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'article',
      url: canonicalUrl,
      title: roadmap.metadataTitle,
      description: roadmap.description,
      siteName: 'QASkills.sh',
      publishedTime: roadmap.updatedAt,
      modifiedTime: roadmap.updatedAt,
      images: [
        {
          url: socialImage,
          width: 1200,
          height: 630,
          alt: roadmap.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: roadmap.metadataTitle,
      description: roadmap.description,
      images: [socialImage],
    },
  };
}

export default async function RoadmapPage({ params }: RoadmapPageProps) {
  const { slug } = await params;
  const roadmap = getRoadmapBySlug(slug);
  if (!roadmap) notFound();

  const canonicalUrl = `https://qaskills.sh/roadmaps/${roadmap.slug}`;
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Home', url: 'https://qaskills.sh' },
    { name: 'Roadmaps', url: 'https://qaskills.sh/roadmaps' },
    { name: roadmap.shortTitle, url: canonicalUrl },
  ]);
  const faqJsonLd = generateFAQJsonLd(
    roadmap.faqs.map((faq) => ({ q: faq.question, a: faq.answer })),
  );
  const howToJsonLd = generateHowToJsonLd({
    name: roadmap.title,
    description: roadmap.description,
    ...(roadmap.timeRequired ? { totalTime: roadmap.timeRequired } : {}),
    steps: roadmap.phases.map((phase) => ({
      name: `${phase.number}. ${phase.title}`,
      text: `${phase.schedule}. ${phase.description}`,
      url: `${canonicalUrl}#${phase.id}`,
    })),
  });
  const learningResourceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: roadmap.title,
    description: roadmap.description,
    url: canonicalUrl,
    learningResourceType: 'Interactive roadmap',
    educationalLevel: roadmap.level,
    audience: {
      '@type': 'Audience',
      audienceType: roadmap.audience,
    },
    teaches: roadmap.outcomes,
    isAccessibleForFree: true,
    dateModified: roadmap.updatedAt,
    provider: {
      '@type': 'Organization',
      name: 'QASkills.sh',
      url: 'https://qaskills.sh',
    },
    hasPart: roadmap.phases.map((phase) => ({
      '@type': 'LearningResource',
      position: phase.number,
      name: phase.title,
      description: phase.description,
      url: `${canonicalUrl}#${phase.id}`,
    })),
  };

  return (
    <div className="pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(learningResourceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/[0.11] via-background to-background">
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-35 [background-image:radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]"
        />

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
          >
            <Link href="/" className="transition-colors hover:text-foreground">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <Link href="/roadmaps" className="transition-colors hover:text-foreground">
              Roadmaps
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span aria-current="page" className="line-clamp-1 text-foreground">
              {roadmap.shortTitle}
            </span>
          </nav>

          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
            <div>
              <Badge className="mb-5 gap-1.5">
                <Route className="h-3.5 w-3.5" />
                {roadmap.eyebrow}
              </Badge>
              <h1 className="max-w-5xl text-balance text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                {roadmap.title}
              </h1>
              <p className="mt-6 max-w-4xl text-pretty text-lg leading-8 text-muted-foreground">
                {roadmap.intro}
              </p>

              <div className="mt-7 flex flex-wrap gap-2 text-sm">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5">
                  <Users className="h-4 w-4 text-primary" />
                  {roadmap.audience}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5">
                  <Gauge className="h-4 w-4 text-primary" />
                  {roadmap.level}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5">
                  <Clock3 className="h-4 w-4 text-primary" />
                  {roadmap.duration}
                </span>
              </div>
            </div>

            <aside className="rounded-2xl border border-primary/20 bg-background/85 p-5 shadow-lg backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                How to use it
              </p>
              <ol className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                <li className="flex gap-3">
                  <span className="font-bold text-foreground">1.</span>
                  Open one phase and work from top to bottom.
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-foreground">2.</span>
                  Check a milestone only after completing its practical output.
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-foreground">3.</span>
                  Use linked guides when you need a deeper technical reference.
                </li>
              </ol>
              <p className="mt-4 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
                This tracker is local to your browser and never publishes or changes site data.
              </p>
            </aside>
          </div>

          <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {roadmap.stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-background/75 p-4 backdrop-blur"
              >
                <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                <dd className="mt-1 text-2xl font-black tracking-tight">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <RoadmapExplorer roadmap={roadmap} />

        <section className="mt-20 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
              Finish line
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">What you will achieve</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {roadmap.outcomes.map((outcome) => (
                <li
                  key={outcome}
                  className="flex gap-3 rounded-xl border border-border bg-card p-4 text-sm leading-6"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="rounded-2xl border border-border bg-muted/30 p-6">
            <Target className="h-6 w-6 text-primary" />
            <h2 className="mt-4 text-xl font-bold">Roadmap scope</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Primary search topic</dt>
                <dd className="mt-1 font-semibold">{roadmap.primaryKeyword}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Roadmap size</dt>
                <dd className="mt-1 font-semibold">
                  {roadmap.phases.length} phases, {getRoadmapItemCount(roadmap)} milestones
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last reviewed</dt>
                <dd className="mt-1 font-semibold">
                  {new Intl.DateTimeFormat('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  }).format(new Date(`${roadmap.updatedAt}T00:00:00Z`))}
                </dd>
              </div>
            </dl>
          </aside>
        </section>

        <section className="mt-20" aria-labelledby="roadmap-resources-title">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Go deeper</p>
            <h2 id="roadmap-resources-title" className="mt-2 text-3xl font-bold tracking-tight">
              Related QASkills resources
            </h2>
            <p className="mt-3 text-muted-foreground">
              Use these guides and installable skills as references while you complete the roadmap.
            </p>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {roadmap.resources.map((resource) => (
              <Link
                key={resource.href}
                href={resource.href}
                className="group flex min-h-full flex-col rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
              >
                <h3 className="font-bold leading-snug group-hover:text-primary">
                  {resource.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                  {resource.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  {resource.label}
                  <ExternalLink className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-20" aria-labelledby="roadmap-faq-title">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Questions</p>
            <h2 id="roadmap-faq-title" className="mt-2 text-3xl font-bold tracking-tight">
              Frequently asked questions
            </h2>
          </div>
          <div className="mt-7 grid gap-3 lg:grid-cols-2">
            {roadmap.faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-xl border border-border bg-card p-5"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-semibold leading-6 [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 border-t border-border pt-3 text-sm leading-6 text-muted-foreground">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-20 overflow-hidden rounded-2xl border border-primary/25 bg-primary/[0.07] p-7 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Explore every QASkills roadmap</h2>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Compare learning paths, choose your next focus area, and continue with a structured
                sequence instead of a disconnected tutorial list.
              </p>
            </div>
            <Link
              href="/roadmaps"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              All roadmaps
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
