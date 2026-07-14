import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { generateBreadcrumbJsonLd } from '@/lib/json-ld';
import { isCanonicalBlogSlug } from '@/lib/blog-canonical';
import { postList, posts } from './posts';

const POSTS_PER_PAGE = 50;
const PAGINATION_RADIUS = 2;
const BLOG_DESCRIPTION =
  'Expert QA testing tutorials, framework comparisons, and AI agent guides — Playwright, Cypress, Selenium, Jest, pytest, and 1,300+ testing topics.';

interface BlogPageProps {
  searchParams: Promise<{ page?: string }>;
}

function parsePage(page: string | undefined): number {
  const parsed = Number.parseInt(page || '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function getBlogPageHref(page: number): string {
  return page === 1 ? '/blog' : `/blog?page=${page}`;
}

function getNumericPaginationPages(currentPage: number, totalPages: number): number[] {
  const firstPage = Math.max(1, currentPage - PAGINATION_RADIUS);
  const lastPage = Math.min(totalPages, currentPage + PAGINATION_RADIUS);

  return Array.from({ length: lastPage - firstPage + 1 }, (_, index) => firstPage + index).filter(
    (page) =>
      (page !== 1 || currentPage === 1) && (page !== totalPages || currentPage === totalPages),
  );
}

export async function generateMetadata({ searchParams }: BlogPageProps): Promise<Metadata> {
  const requestedPage = parsePage((await searchParams).page);
  const title =
    requestedPage === 1
      ? 'QA Testing Blog: Tutorials, Guides & AI Agent Tips'
      : `QA Testing Blog Articles — Page ${requestedPage}`;
  const canonical =
    requestedPage === 1
      ? 'https://qaskills.sh/blog'
      : `https://qaskills.sh/blog?page=${requestedPage}`;
  const socialTitle = `${title} | QASkills.sh`;
  const ogImage = `/api/og?title=${encodeURIComponent(title)}&description=${encodeURIComponent(
    requestedPage === 1
      ? BLOG_DESCRIPTION
      : `Browse QA testing tutorials and guides on page ${requestedPage} of the QASkills.sh blog.`,
  )}`;

  return {
    title,
    description: BLOG_DESCRIPTION,
    alternates: { canonical },
    openGraph: {
      title: socialTitle,
      description: BLOG_DESCRIPTION,
      url: canonical,
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: socialTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: BLOG_DESCRIPTION,
      images: [ogImage],
    },
  };
}

// Curated high-demand guides — surfaced first to concentrate internal-link
// equity onto our highest-impression pages (GSC) and lift them out of page 2.
const FEATURED_SLUGS = [
  'playwright-cli-complete-guide-2026',
  'playwright-mcp-browser-automation-guide',
  'comparing-popular-bdd-frameworks-2026-complete-guide',
  'playwright-storagestate-authentication-reference',
  'python-vs-pytest-explained',
  'openai-evals-complete-guide-2026',
  'unittest-vs-pytest-2026',
  'playwright-accessibility-testing-axe-complete-guide',
  'k6-vs-jmeter-2026',
  'testcontainers-kafka-node-complete-guide',
  'promptfoo-complete-guide-2026',
  'ragas-rag-evaluation-metrics-complete-guide',
  'playwright-trace-viewer-complete-guide-2026',
  'selenide-allure-integration-complete-reference',
  // Keyword-gap batch (2026-06-15) — fresh pages targeting real GSC demand; featured to
  // concentrate internal-link equity and accelerate indexing/ranking.
  'postman-vs-playwright-2026',
  'playwright-setinputfiles-file-upload-reference',
  'whats-new-playwright-2026',
  'pyunit-vs-pytest-2026',
];

const visiblePostList = postList.filter((post) => isCanonicalBlogSlug(post.slug));

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const requestedPage = parsePage((await searchParams).page);
  const totalPages = Math.max(1, Math.ceil(visiblePostList.length / POSTS_PER_PAGE));
  if (requestedPage > totalPages) notFound();

  const currentPage = requestedPage;
  const firstPostIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const pagePosts = visiblePostList.slice(firstPostIndex, firstPostIndex + POSTS_PER_PAGE);
  const numericPaginationPages = getNumericPaginationPages(currentPage, totalPages);
  const firstNumericPage = numericPaginationPages[0];
  const lastNumericPage = numericPaginationPages[numericPaginationPages.length - 1];

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Blog',
            name: 'QASkills.sh Blog',
            description: 'QA testing insights, tutorials, and guides for AI coding agents.',
            url: 'https://qaskills.sh/blog',
            publisher: {
              '@type': 'Organization',
              name: 'QASkills.sh',
              url: 'https://qaskills.sh',
            },
            blogPost: pagePosts.map((post) => ({
              '@type': 'BlogPosting',
              headline: post.title,
              datePublished: post.date,
              dateModified: post.updated || post.date,
              url: `https://qaskills.sh/blog/${post.slug}`,
            })),
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            generateBreadcrumbJsonLd([
              { name: 'Home', url: 'https://qaskills.sh' },
              { name: 'Blog', url: 'https://qaskills.sh/blog' },
            ]),
          ),
        }}
      />
      <div className="mb-12">
        <h1 className="text-4xl font-bold">Blog</h1>
        <p className="mt-2 text-muted-foreground">
          QA testing insights, AI agent tips, and skill development guides
        </p>
      </div>

      {currentPage === 1 ? (
        <section className="mb-14" aria-label="Most in-demand guides">
          <h2 className="mb-4 text-2xl font-bold">Most In-Demand Guides</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {FEATURED_SLUGS.filter((s) => posts[s]).map((slug) => {
              const p = posts[slug];
              return (
                <Link
                  key={slug}
                  href={`/blog/${slug}`}
                  className="group block rounded-lg border border-primary/30 bg-primary/5 p-4 transition-colors hover:border-primary"
                >
                  <div className="mb-1.5">
                    <Badge variant="secondary" className="text-xs">
                      {p.category}
                    </Badge>
                  </div>
                  <h3 className="font-semibold leading-snug group-hover:text-primary">{p.title}</h3>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="text-2xl font-bold">All Articles</h2>
        <p className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </p>
      </div>
      <div className="space-y-6">
        {pagePosts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{post.category}</Badge>
                  <span className="text-sm text-muted-foreground">{post.date}</span>
                </div>
                <CardTitle className="text-xl">{post.title}</CardTitle>
                <CardDescription className="text-base">{post.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <nav className="mt-12 border-t border-border pt-8" aria-label="Blog pagination">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {currentPage > 1 ? (
            <>
              <Link
                href={getBlogPageHref(1)}
                aria-label="Go to first blog page"
                className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:border-primary"
              >
                First
              </Link>
              <Link
                href={getBlogPageHref(currentPage - 1)}
                rel="prev"
                aria-label={`Go to blog page ${currentPage - 1}`}
                className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:border-primary"
              >
                Previous
              </Link>
            </>
          ) : null}

          {firstNumericPage > 2 ? (
            <span className="px-1 text-muted-foreground" aria-hidden="true">
              …
            </span>
          ) : null}

          {numericPaginationPages.map((page) =>
            page === currentPage ? (
              <span
                key={page}
                aria-current="page"
                aria-label={`Blog page ${page}`}
                className="min-w-10 rounded-md border border-primary bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground"
              >
                {page}
              </span>
            ) : (
              <Link
                key={page}
                href={getBlogPageHref(page)}
                aria-label={`Go to blog page ${page}`}
                className="min-w-10 rounded-md border border-border px-3 py-2 text-center text-sm font-medium hover:border-primary"
              >
                {page}
              </Link>
            ),
          )}

          {lastNumericPage < totalPages - 1 ? (
            <span className="px-1 text-muted-foreground" aria-hidden="true">
              …
            </span>
          ) : null}

          {currentPage < totalPages ? (
            <>
              <Link
                href={getBlogPageHref(currentPage + 1)}
                rel="next"
                aria-label={`Go to blog page ${currentPage + 1}`}
                className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:border-primary"
              >
                Next
              </Link>
              <Link
                href={getBlogPageHref(totalPages)}
                aria-label="Go to last blog page"
                className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:border-primary"
              >
                Last
              </Link>
            </>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
