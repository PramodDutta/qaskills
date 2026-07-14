import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Metadata } from 'next';
import { generateBlogPostJsonLd, generateBreadcrumbJsonLd, generateFAQJsonLd } from '@/lib/json-ld';
import { extractFAQs } from '@/lib/extract-faqs';
import { getCanonicalBlogSlug } from '@/lib/blog-canonical';
import { getRelatedPosts } from '@/lib/related-posts';
import { posts } from '../posts';
import { seoWaveOneArticles2026 } from '../posts/seo-wave-one-articles-2026';
import { BlogContent } from '@/components/blog/blog-content';
import { CourseAd } from '@/components/course-ad';
import { splitAtMidHeading } from '@/lib/split-content';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = true;

export function generateStaticParams() {
  return seoWaveOneArticles2026.map(({ slug }) => ({ slug }));
}

function formatSourceLabel(source: string): string {
  try {
    const url = new URL(source);
    const path = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');
    return `${url.hostname.replace(/^www\./, '')}${path}`;
  } catch {
    return source;
  }
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const canonicalSlug = getCanonicalBlogSlug(slug);
  const post = posts[canonicalSlug];
  if (!post) return { title: 'Post Not Found' };

  const ogImageUrl =
    post.image ||
    `/api/og?title=${encodeURIComponent(post.title)}&description=${encodeURIComponent(post.description)}`;
  const ogImageDimensions = post.image
    ? { width: 1600, height: 900 }
    : { width: 1200, height: 630 };

  return {
    title: post.title,
    description: post.description,
    ...(post.keywords && { keywords: post.keywords }),
    openGraph: {
      title: `${post.title} | QASkills.sh`,
      description: post.description,
      url: `https://qaskills.sh/blog/${canonicalSlug}`,
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.updated || post.date,
      images: [{ url: ogImageUrl, ...ogImageDimensions, alt: post.imageAlt || post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [ogImageUrl],
    },
    alternates: { canonical: `https://qaskills.sh/blog/${canonicalSlug}` },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const canonicalSlug = getCanonicalBlogSlug(slug);

  if (canonicalSlug !== slug) {
    permanentRedirect(`/blog/${canonicalSlug}`);
  }

  const post = posts[canonicalSlug];

  if (!post) notFound();

  // Extract FAQ Q&A pairs from markdown body for FAQPage JSON-LD
  // (AI Overviews + ChatGPT/Claude/Perplexity citation). Empty array if no FAQ section.
  const faqs = extractFAQs(post.content, 10);

  // Internal linking: related posts by category + token overlap (SEO — passes
  // authority + keeps crawlers traversing the corpus). Server-computed, links only.
  const related = getRelatedPosts(canonicalSlug, posts, 6);

  const clusterSlugs = Array.from(
    new Set([post.pillarSlug, ...(post.relatedSlugs || [])].filter(Boolean) as string[]),
  ).filter((relatedSlug) => relatedSlug !== canonicalSlug && posts[relatedSlug]);
  const clusterPosts = clusterSlugs.map((relatedSlug) => ({
    slug: relatedSlug,
    ...posts[relatedSlug],
  }));

  const wordCount = post.content.trim().split(/\s+/).filter(Boolean).length;
  const schemaImage = post.image
    ? post.image.startsWith('http')
      ? post.image
      : `https://qaskills.sh${post.image}`
    : `https://qaskills.sh/api/og?title=${encodeURIComponent(post.title)}&description=${encodeURIComponent(post.description)}`;

  // Split long posts at a mid heading so a contextual course ad renders inline
  // without breaking the markdown. Short posts get only the end-of-article ad.
  const [firstHalf, secondHalf] = splitAtMidHeading(post.content);
  const adCtx = { category: post.category, title: post.title };

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
              dateModified: post.updated,
              slug: canonicalSlug,
              image: schemaImage,
              keywords: post.keywords,
              articleSection: post.category,
              wordCount,
            }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            generateBreadcrumbJsonLd([
              { name: 'Home', url: 'https://qaskills.sh' },
              { name: 'Blog', url: 'https://qaskills.sh/blog' },
              { name: post.title, url: `https://qaskills.sh/blog/${canonicalSlug}` },
            ]),
          ),
        }}
      />
      {faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateFAQJsonLd(faqs)),
          }}
        />
      )}

      <Link
        href="/blog"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8"
      >
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

        {post.image ? (
          <div className="mb-10 overflow-hidden rounded-xl border border-border">
            <Image
              src={post.image}
              alt={post.imageAlt || post.title}
              width={1600}
              height={900}
              sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 767px) calc(100vw - 3rem), (max-width: 1023px) 720px, 704px"
              className="h-auto w-full object-cover"
              priority
            />
          </div>
        ) : null}

        {secondHalf ? (
          <>
            <BlogContent content={firstHalf} />
            <CourseAd course="auto" variant="inline" slot="blog-mid" ctx={adCtx} />
            <BlogContent content={secondHalf} />
          </>
        ) : (
          <BlogContent content={post.content} />
        )}

        {post.sources && post.sources.length > 0 ? (
          <aside
            className="mt-12 rounded-xl border border-border bg-muted/30 p-6"
            aria-label="Primary sources"
            data-testid="article-sources"
          >
            <h2 className="text-xl font-bold">Primary sources</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Product behavior and version-sensitive claims in this guide were checked against these
              first-party references.
            </p>
            <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              {post.sources.map((source) => (
                <li key={source} className="min-w-0">
                  <a
                    href={source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-primary hover:underline"
                    title={source}
                  >
                    {formatSourceLabel(source)}
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}

        <CourseAd course="auto" variant="inline" slot="blog-end" ctx={adCtx} />
      </article>

      {clusterPosts.length > 0 && (
        <aside
          className="mt-12 rounded-xl border border-primary/20 bg-primary/5 p-6"
          aria-label="Topic cluster"
          data-testid="topic-cluster"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Topic cluster
          </p>
          <h2 className="mt-2 text-2xl font-bold">Continue with the connected guides</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            These articles cover the next practical questions in this subject without repeating the
            material on this page.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {clusterPosts.map((clusterPost) => (
              <Link
                key={clusterPost.slug}
                href={`/blog/${clusterPost.slug}`}
                className="rounded-lg border border-border bg-background p-4 transition-colors hover:border-primary"
              >
                <span className="text-xs text-muted-foreground">
                  {clusterPost.contentKind === 'pillar' ? 'Pillar guide' : 'Practical guide'}
                </span>
                <span className="mt-1 block font-semibold leading-snug">{clusterPost.title}</span>
              </Link>
            ))}
          </div>
        </aside>
      )}

      {related.length > 0 && (
        <aside className="mt-16 border-t border-border pt-10" aria-label="Related articles">
          <h2 className="mb-6 text-2xl font-bold">Related Articles</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/blog/${r.slug}`}
                className="group block rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary"
              >
                <div className="mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {r.category}
                  </Badge>
                </div>
                <h3 className="font-semibold leading-snug group-hover:text-primary">{r.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
              </Link>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <Link href="/blog" className="text-primary hover:underline">
              Browse all articles
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link href="/skills" className="text-primary hover:underline">
              Install QA skills
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link href="/compare" className="text-primary hover:underline">
              Compare tools
            </Link>
          </div>
        </aside>
      )}
    </div>
  );
}
