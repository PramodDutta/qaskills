import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { generateBreadcrumbJsonLd } from '@/lib/json-ld';
import { postList, posts } from './posts';

export const metadata = {
  title: 'QA Testing Blog: Tutorials, Guides & AI Agent Tips',
  description:
    'Expert QA testing tutorials, framework comparisons, and AI agent guides. Playwright, Cypress, Selenium, Jest, pytest, and 100+ testing topics. By The Testing Academy.',
};

// Curated high-demand guides — surfaced first to concentrate internal-link
// equity onto our highest-impression pages (GSC) and lift them out of page 2.
const FEATURED_SLUGS = [
  'comparing-popular-bdd-frameworks-2026-complete-guide',
  'playwright-storagestate-authentication-reference',
  'python-vs-pytest-explained',
  'openai-evals-complete-guide-2026',
  'unittest-vs-pytest-2026',
  'playwright-accessibility-testing-axe-complete-guide',
  'k6-vs-jmeter-2026-which-better',
  'testcontainers-kafka-node-complete-guide',
  'promptfoo-complete-guide-2026',
  'ragas-rag-evaluation-metrics-complete-guide',
  'playwright-trace-viewer-complete-guide-2026',
  'selenide-allure-integration-complete-reference',
];

export default function BlogPage() {
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
            blogPost: postList.map((post) => ({
              '@type': 'BlogPosting',
              headline: post.title,
              datePublished: post.date,
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
            ])
          ),
        }}
      />
      <div className="mb-12">
        <h1 className="text-4xl font-bold">Blog</h1>
        <p className="mt-2 text-muted-foreground">QA testing insights, AI agent tips, and skill development guides</p>
      </div>

      {/* Most In-Demand Guides — curated internal links to highest-traffic articles */}
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
                <h3 className="font-semibold leading-snug group-hover:text-primary">
                  {p.title}
                </h3>
              </Link>
            );
          })}
        </div>
      </section>

      <h2 className="mb-6 text-2xl font-bold">All Articles</h2>
      <div className="space-y-6">
        {postList.map((post) => (
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
    </div>
  );
}
