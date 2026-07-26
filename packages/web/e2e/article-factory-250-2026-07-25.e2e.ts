import { expect, test } from '@playwright/test';
import { articleFactory250Posts } from '../src/app/blog/posts/_article-factory-250-2026-07-25';

const requestSamples = articleFactory250Posts.filter((_, index) => index % 25 === 0);
const browserSamples = articleFactory250Posts.filter((_, index) => index % 50 === 0);

test('sitemap publishes all 250 codebase-driven SEO articles', async ({ request }) => {
  const response = await request.get('/sitemap.xml');
  const xml = await response.text();

  expect(response.ok()).toBeTruthy();
  for (const { slug } of articleFactory250Posts) {
    expect(xml).toContain(`<loc>https://qaskills.sh/blog/${slug}</loc>`);
  }
});

for (const { slug, post } of requestSamples) {
  test(`250-article publication contract renders: ${slug}`, async ({ request }) => {
    const response = await request.get(`/blog/${slug}`);
    const html = await response.text();
    const schemas = Array.from(
      html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
      (match) => JSON.parse(match[1]) as { '@type'?: string; wordCount?: number },
    );
    const blogPosting = schemas.find((schema) => schema['@type'] === 'BlogPosting');

    expect(response.ok()).toBeTruthy();
    expect(html).toContain(post.title);
    expect(html).toContain(`https://qaskills.sh/blog/${slug}`);
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1);
    expect(schemas.map((schema) => schema['@type'])).toEqual(
      expect.arrayContaining(['BlogPosting', 'FAQPage', 'BreadcrumbList']),
    );
    expect(blogPosting?.wordCount).toBeGreaterThanOrEqual(3_000);
    expect(blogPosting?.wordCount).toBeLessThanOrEqual(4_000);
    expect(html).toContain('Pramod Dutta');
    expect(html).toContain('The Testing Academy');
    expect(html).toContain('Primary sources');
    expect(html).toContain('data-testid="article-sources"');
  });
}

for (const { slug, post } of browserSamples) {
  test(`250-article browser navigation works: ${slug}`, async ({ page }) => {
    await page.goto(`/blog/${slug}`);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(post.title);
    await expect(page.getByTestId('article-sources')).toBeVisible();
    await expect(page.getByRole('link', { name: /Back to Blog/i })).toBeVisible();
  });
}
