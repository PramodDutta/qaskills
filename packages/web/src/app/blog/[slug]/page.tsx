import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Metadata } from 'next';
import {
  generateBlogPostJsonLd,
  generateBreadcrumbJsonLd,
  generateFAQJsonLd,
} from '@/lib/json-ld';
import { extractFAQs } from '@/lib/extract-faqs';
import { getRelatedPosts } from '@/lib/related-posts';
import { posts } from '../posts';
import { BlogContent } from '@/components/blog/blog-content';
import { CourseAd } from '@/components/course-ad';
import { splitAtMidHeading } from '@/lib/split-content';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = posts[slug];
  if (!post) return { title: 'Post Not Found' };

  const ogImageUrl =
    post.image ||
    `/api/og?title=${encodeURIComponent(post.title)}&description=${encodeURIComponent(post.description)}`;

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
    alternates: { canonical: `https://qaskills.sh/blog/${slug}` },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = posts[slug];

  if (!post) notFound();

  // Extract FAQ Q&A pairs from markdown body for FAQPage JSON-LD
  // (AI Overviews + ChatGPT/Claude/Perplexity citation). Empty array if no FAQ section.
  const faqs = extractFAQs(post.content, 10);

  // Internal linking: related posts by category + token overlap (SEO — passes
  // authority + keeps crawlers traversing the corpus). Server-computed, links only.
  const related = getRelatedPosts(slug, posts, 6);

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
              slug,
              image:
                post.image ||
                `https://qaskills.sh/api/og?title=${encodeURIComponent(post.title)}&description=${encodeURIComponent(post.description)}`,
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
              { name: post.title, url: `https://qaskills.sh/blog/${slug}` },
            ])
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

        {post.image ? (
          <div className="mb-10 overflow-hidden rounded-xl border border-border">
            <Image
              src={post.image}
              alt={post.imageAlt || post.title}
              width={1600}
              height={900}
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

        <CourseAd course="auto" variant="inline" slot="blog-end" ctx={adCtx} />
      </article>

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
                <h3 className="font-semibold leading-snug group-hover:text-primary">
                  {r.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {r.description}
                </p>
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
