import * as React from 'react';
import { Children, isValidElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.stubGlobal('React', React);

const mockedPostList = vi.hoisted(() =>
  Array.from({ length: 300 }, (_, index) => ({
    slug: `post-${index + 1}`,
    title: `Post ${index + 1}`,
    description: `Description ${index + 1}`,
    date: '2025-01-01',
    category: 'Testing',
  })),
);

vi.mock('next/link', () => ({ default: () => null }));
vi.mock('next/navigation', () => ({ notFound: () => undefined }));
vi.mock('@/components/ui/card', () => ({
  Card: () => null,
  CardHeader: () => null,
  CardTitle: () => null,
  CardDescription: () => null,
}));
vi.mock('@/components/ui/badge', () => ({ Badge: () => null }));
vi.mock('@/lib/json-ld', () => ({ generateBreadcrumbJsonLd: () => ({}) }));
vi.mock('@/lib/blog-canonical', () => ({ isCanonicalBlogSlug: () => true }));
vi.mock('./posts', () => ({ postList: mockedPostList, posts: {} }));

import BlogPage, { generateMetadata } from './page';

function collectHrefs(node: ReactNode): string[] {
  if (!isValidElement<{ children?: ReactNode; href?: unknown }>(node)) return [];

  const href = typeof node.props.href === 'string' ? [node.props.href] : [];
  return [
    ...href,
    ...Children.toArray(node.props.children).flatMap((child) => collectHrefs(child)),
  ];
}

describe('blog pagination SEO', () => {
  it('generates page-specific social metadata for paginated listings', async () => {
    const firstPage = await generateMetadata({ searchParams: Promise.resolve({}) });
    const thirdPage = await generateMetadata({
      searchParams: Promise.resolve({ page: '3' }),
    });

    const firstImage = (firstPage.openGraph?.images as Array<{ url: string }>)[0].url;
    const thirdImage = (thirdPage.openGraph?.images as Array<{ url: string }>)[0].url;

    expect(thirdPage.alternates?.canonical).toBe('https://qaskills.sh/blog?page=3');
    expect(thirdPage.openGraph?.url).toBe('https://qaskills.sh/blog?page=3');
    expect(thirdImage).toContain('Page%203');
    expect(thirdImage).not.toBe(firstImage);
    expect(thirdPage.twitter).toMatchObject({
      card: 'summary_large_image',
      images: [thirdImage],
    });
  });

  it('keeps page one canonical without emitting a duplicate page-one query URL', async () => {
    const metadata = await generateMetadata({ searchParams: Promise.resolve({}) });
    const tree = await BlogPage({ searchParams: Promise.resolve({}) });
    const hrefs = collectHrefs(tree);

    expect(metadata.alternates?.canonical).toBe('https://qaskills.sh/blog');
    expect(hrefs).not.toContain('/blog?page=1');
    expect(hrefs).toContain('/blog?page=2');
    expect(hrefs).toContain('/blog?page=3');
    expect(hrefs).toContain('/blog?page=6');
  });

  it('renders crawlable first, numeric, previous, next, and last links', async () => {
    const tree = await BlogPage({ searchParams: Promise.resolve({ page: '3' }) });
    const hrefs = collectHrefs(tree);

    expect(hrefs).toContain('/blog');
    expect(hrefs).toContain('/blog?page=2');
    expect(hrefs).toContain('/blog?page=4');
    expect(hrefs).toContain('/blog?page=5');
    expect(hrefs).toContain('/blog?page=6');
  });
});
