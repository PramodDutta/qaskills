import * as React from 'react';
import { Children, isValidElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.stubGlobal('React', React);

vi.mock('next/link', () => ({ default: () => null }));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('next/navigation', () => ({
  notFound: () => undefined,
  permanentRedirect: () => undefined,
}));
vi.mock('lucide-react', () => ({ ArrowLeft: () => null }));
vi.mock('@/components/ui/badge', () => ({ Badge: () => null }));
vi.mock('@/components/blog/blog-content', () => ({ BlogContent: () => null }));
vi.mock('@/components/course-ad', () => ({ CourseAd: () => null }));
vi.mock('@/lib/json-ld', () => ({
  generateBlogPostJsonLd: () => ({}),
  generateBreadcrumbJsonLd: () => ({}),
  generateFAQJsonLd: () => ({}),
}));
vi.mock('@/lib/extract-faqs', () => ({ extractFAQs: () => [] }));
vi.mock('@/lib/blog-canonical', () => ({ getCanonicalBlogSlug: (slug: string) => slug }));
vi.mock('@/lib/related-posts', () => ({ getRelatedPosts: () => [] }));
vi.mock('@/lib/split-content', () => ({ splitAtMidHeading: (content: string) => [content, ''] }));
vi.mock('../posts', () => ({
  posts: {
    example: {
      title: 'Example post',
      description: 'Example description',
      date: '2025-01-01',
      category: 'Testing',
      content: 'Example content',
      image: '/blog/example.png',
      imageAlt: 'Example article image',
    },
  },
}));
vi.mock('../posts/seo-wave-one-articles-2026', () => ({ seoWaveOneArticles2026: [] }));

import BlogPostPage from './page';

function findSizes(node: ReactNode): string | undefined {
  if (!isValidElement<{ children?: ReactNode; sizes?: unknown }>(node)) return undefined;
  if (typeof node.props.sizes === 'string') return node.props.sizes;

  for (const child of Children.toArray(node.props.children)) {
    const sizes = findSizes(child);
    if (sizes) return sizes;
  }

  return undefined;
}

describe('blog article images', () => {
  it('provides responsive source sizes for article hero images', async () => {
    const tree = await BlogPostPage({ params: Promise.resolve({ slug: 'example' }) });

    expect(findSizes(tree)).toBe(
      '(max-width: 639px) calc(100vw - 2rem), (max-width: 767px) calc(100vw - 3rem), (max-width: 1023px) 720px, 704px',
    );
  });
});
