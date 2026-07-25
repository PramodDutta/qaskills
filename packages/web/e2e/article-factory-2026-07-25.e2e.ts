import { expect, test } from '@playwright/test';
import { articleFactoryBatch20260725Posts } from '../src/app/blog/posts/_article-factory-batch-2026-07-25';

test('sitemap publishes the 2026-07-25 article factory batch', async ({ request }) => {
  const response = await request.get('/sitemap.xml');
  const xml = await response.text();

  expect(response.ok()).toBeTruthy();
  for (const { slug } of articleFactoryBatch20260725Posts) {
    expect(xml).toContain(`<loc>https://qaskills.sh/blog/${slug}</loc>`);
  }
});

for (const { slug, post } of articleFactoryBatch20260725Posts) {
  test(`2026-07-25 article contract renders: ${slug}`, async ({ request }) => {
    const response = await request.get(`/blog/${slug}`);
    const html = await response.text();
    const schemas = Array.from(
      html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
      (match) => JSON.parse(match[1]) as { '@type'?: string },
    );

    expect(response.ok()).toBeTruthy();
    expect(html).toContain(post.title);
    expect(html).toContain(`https://qaskills.sh/blog/${slug}`);
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1);
    expect(html).toContain('"@type":"BlogPosting"');
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(schemas.map((schema) => schema['@type'])).toEqual(
      expect.arrayContaining(['BlogPosting', 'FAQPage', 'BreadcrumbList']),
    );
    expect(html).toContain('"wordCount":');
    expect(html).toContain('Pramod Dutta');
    expect(html).toContain('The Testing Academy');
    expect(html).toContain('Primary sources');
    expect(html).toContain('data-testid="article-sources"');
    expect(html).toContain('/skills/Pramod/playwright-cli');
  });
}

test('a new article renders in Chromium with its public navigation', async ({ page }) => {
  const article = articleFactoryBatch20260725Posts[0];

  await page.goto(`/blog/${article.slug}`);

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(article.post.title);
  await expect(page.getByTestId('article-sources')).toBeVisible();
  await expect(page.locator('a[href="/skills/Pramod/playwright-cli"]').first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Back to Blog/i })).toBeVisible();
});
