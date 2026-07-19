import { expect, test } from '@playwright/test';
import { articleFactoryBatch20260718Posts } from '../src/app/blog/posts/_article-factory-batch-2026-07';
import { seoWaveOneArticles2026 } from '../src/app/blog/posts/seo-wave-one-articles-2026';

const playwrightLongTailPosts = [
  {
    slug: 'playwright-locators-best-practices-2026',
    title: 'Playwright Locators Best Practices in 2026',
  },
  {
    slug: 'playwright-browser-context-guide-2026',
    title: 'Playwright BrowserContext Guide for Isolated Sessions and Faster Parallel Tests',
  },
  {
    slug: 'playwright-multiple-tabs-popups-tutorial-2026',
    title: 'Playwright Multiple Tabs and Popups Tutorial for Real Browser Flows',
  },
  {
    slug: 'playwright-file-upload-testing-guide-2026',
    title: 'Playwright File Upload Testing Guide with setInputFiles and FileChooser',
  },
  {
    slug: 'playwright-file-download-testing-guide-2026',
    title: 'Playwright File Download Testing Guide with waitForEvent and saveAs',
  },
  {
    slug: 'playwright-evaluate-tutorial-2026',
    title: 'Playwright page.evaluate() Tutorial: Execute Browser JavaScript Safely',
  },
  {
    slug: 'playwright-video-recording-guide-2026',
    title: 'Playwright Video Recording Guide for CI Failures and Faster Debugging',
  },
  {
    slug: 'playwright-dialog-handling-guide-2026',
    title: 'Playwright Dialog Handling Guide: Alerts, Confirms, and Prompts',
  },
  {
    slug: 'playwright-browser-install-guide-2026',
    title: 'Playwright Browser Install Guide for Local Setup, CI, and Docker',
  },
  {
    slug: 'playwright-screenshots-pdf-guide-2026',
    title: 'Playwright Screenshots and PDF Automation Guide for QA Teams',
  },
];

const expectedTopSkills = [
  '/skills/thetestingacademy/playwright-e2e',
  '/skills/vibiumdev/vibe-check',
  '/skills/Pramod/playwright-cli',
];

test('skills page ranks Playwright CLI exactly third and marks it NEW', async ({ page }) => {
  await page.goto('/skills?sort=most_installed');

  await expect(page.getByRole('heading', { name: 'Browse QA Skills' })).toBeVisible();
  const cards = page.locator('a[href^="/skills/"]');

  for (const [index, href] of expectedTopSkills.entries()) {
    await expect(cards.nth(index)).toHaveAttribute('href', href);
  }
  await expect(cards.nth(2).getByText('NEW', { exact: true })).toBeVisible();
});

test('all-time leaderboard ranks Playwright CLI exactly third and marks it NEW', async ({
  page,
}) => {
  await page.goto('/leaderboard?filter=all');

  await expect(page.getByRole('heading', { name: 'Leaderboard' })).toBeVisible();
  const rows = page.locator('a[href^="/skills/"]');

  for (const [index, href] of expectedTopSkills.entries()) {
    await expect(rows.nth(index)).toHaveAttribute('href', href);
  }
  await expect(rows.nth(2).getByText('#3', { exact: true })).toBeVisible();
  await expect(rows.nth(2).getByText('NEW', { exact: true })).toBeVisible();
});

test('Playwright CLI article CTA resolves to an installable skill and source artifact', async ({
  page,
  request,
}) => {
  await page.goto('/skills/Pramod/playwright-cli');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Playwright CLI Browser Automation' }),
  ).toBeVisible();
  await expect(page.getByText('Install', { exact: true })).toBeVisible();
  await expect(
    page.getByText('npx @qaskills/cli add playwright-cli', { exact: true }),
  ).toBeVisible();

  const response = await request.get('/api/skills/playwright-cli/content');
  const markdown = await response.text();

  expect(response.ok()).toBeTruthy();
  expect(response.headers()['content-type']).toContain('text/markdown');
  expect(markdown).toContain('name: Playwright CLI Browser Automation');
  expect(markdown).toContain('playwright-cli snapshot');
});

test('blog index paginates the approved SEO wave articles', async ({ page }) => {
  await page.goto('/blog');

  await expect(
    page.getByText('QA testing insights, AI agent tips, and skill development guides'),
  ).toBeVisible();
  await expect(
    page.getByText('Playwright CLI Complete Guide for Browser Automation and AI Agents').first(),
  ).toBeVisible();
  const paginationStatus = page.getByText(/Page 1 of \d+/);
  await expect(paginationStatus).toBeVisible();
  await expect(page.locator('a[rel="next"]')).toHaveAttribute('href', '/blog?page=2');

  const pageCountMatch = (await paginationStatus.textContent())?.match(/of (\d+)/);
  const totalPages = Number(pageCountMatch?.[1]);
  const remainingSlugs = new Set(seoWaveOneArticles2026.map(({ slug }) => slug));

  expect(totalPages).toBeGreaterThan(1);

  for (let currentPage = 1; currentPage <= totalPages && remainingSlugs.size > 0; currentPage++) {
    const hrefs = new Set(
      await page
        .locator('a[href^="/blog/"]')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
    );

    for (const slug of remainingSlugs) {
      if (hrefs.has(`/blog/${slug}`)) remainingSlugs.delete(slug);
    }

    if (remainingSlugs.size > 0 && currentPage < totalPages) {
      await page.locator('a[rel="next"]').click();
      await expect(page).toHaveURL(new RegExp(`/blog\\?page=${currentPage + 1}$`));
    }
  }

  expect([...remainingSlugs], 'SEO wave articles missing from blog pagination').toEqual([]);
});

test('sitemap publishes every approved SEO wave URL', async ({ request }) => {
  const response = await request.get('/sitemap.xml');
  const xml = await response.text();

  expect(response.ok()).toBeTruthy();
  for (const { slug } of seoWaveOneArticles2026) {
    expect(xml).toContain(`<loc>https://qaskills.sh/blog/${slug}</loc>`);
  }
});

test('sitemap publishes every codebase-driven article factory URL', async ({ request }) => {
  const response = await request.get('/sitemap.xml');
  const xml = await response.text();

  expect(response.ok()).toBeTruthy();
  for (const { slug } of articleFactoryBatch20260718Posts) {
    expect(xml).toContain(`<loc>https://qaskills.sh/blog/${slug}</loc>`);
  }
});

test('Roadmaps navigation exposes the reusable roadmap library', async ({ page }) => {
  await page.goto('/roadmaps');

  await expect(
    page.getByRole('heading', { level: 1, name: 'QA & Test Automation Roadmaps' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Roadmaps', exact: true }).first()).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(
    page.getByTestId('roadmap-card-playwright-automation-90-day-roadmap'),
  ).toHaveAttribute('href', '/roadmaps/playwright-automation-90-day-roadmap');
  await expect(page.getByTestId('roadmap-card-qa-seo-content-roadmap-2026')).toHaveAttribute(
    'href',
    '/roadmaps/qa-seo-content-roadmap-2026',
  );
});

test('Playwright roadmap tracks milestones and persists progress locally', async ({ page }) => {
  await page.goto('/roadmaps/playwright-automation-90-day-roadmap');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Playwright Automation Roadmap with JavaScript, TypeScript, and AI',
    }),
  ).toBeVisible();
  await expect(page.locator('[data-testid^="roadmap-phase-"]')).toHaveCount(4);
  await expect(page.getByTestId('roadmap-progress-count')).toHaveText('0/30');

  const firstMilestone = page.getByRole('checkbox', {
    name: /Mark complete: Set up Node.js and learn JavaScript runtime basics/,
  });
  await firstMilestone.click();
  await expect(page.getByTestId('roadmap-progress-count')).toHaveText('1/30');

  await page.reload();
  await expect(page.getByTestId('roadmap-progress-count')).toHaveText('1/30');
  await page.getByRole('button', { name: 'Reset progress' }).click();
  await expect(page.getByTestId('roadmap-progress-count')).toHaveText('0/30');
});

test('SEO roadmap renders all 100 topics with accurate local readiness', async ({ page }) => {
  await page.goto('/roadmaps/qa-seo-content-roadmap-2026');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'QA SEO Content Roadmap for Playwright, AI Testing, RAG, and MCP',
    }),
  ).toBeVisible();
  await expect(page.locator('[data-testid^="roadmap-phase-"]')).toHaveCount(10);
  const roadmapItems = page.locator('[data-testid^="roadmap-item-"]');
  await expect(roadmapItems).toHaveCount(100);
  await expect(page.getByTestId('roadmap-progress-count')).toHaveText('50/100');
  await expect(roadmapItems.getByText('Ready locally', { exact: true })).toHaveCount(50);
  await expect(roadmapItems.getByText('Backlog', { exact: true })).toHaveCount(50);

  await page.getByRole('searchbox', { name: 'Search roadmap milestones' }).fill('passkey');
  await expect(
    page.getByText('Playwright 1.61 WebAuthn Passkey Testing with Virtual Authenticators'),
  ).toBeVisible();
  await expect(page.locator('[data-testid^="roadmap-item-"]')).toHaveCount(1);
});

test('Roadmaps are reachable from the mobile menu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/skills');
  await page.getByRole('button', { name: 'Toggle menu' }).click();
  await page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', {
      name: 'Roadmaps',
      exact: true,
    })
    .click();

  await expect(page).toHaveURL('/roadmaps');
  await expect(
    page.getByRole('heading', { level: 1, name: 'QA & Test Automation Roadmaps' }),
  ).toBeVisible();
});

test('sitemap publishes the roadmap hub and detail URLs', async ({ request }) => {
  const response = await request.get('/sitemap.xml');
  const xml = await response.text();

  expect(response.ok()).toBeTruthy();
  expect(xml).toContain('<loc>https://qaskills.sh/roadmaps</loc>');
  expect(xml).toContain(
    '<loc>https://qaskills.sh/roadmaps/playwright-automation-90-day-roadmap</loc>',
  );
  expect(xml).toContain('<loc>https://qaskills.sh/roadmaps/qa-seo-content-roadmap-2026</loc>');
});

test('duplicate blog aliases permanently redirect to canonical articles', async ({ request }) => {
  const response = await request.get('/blog/playwright-test-agents-planner-generator-healer-2026', {
    maxRedirects: 0,
  });

  expect(response.status()).toBe(308);
  expect(response.headers().location).toContain(
    '/blog/playwright-test-agents-planner-generator-healer',
  );
});

for (const { slug, title } of playwrightLongTailPosts) {
  test(`blog post smoke renders: ${slug}`, async ({ request }) => {
    const response = await request.get(`/blog/${slug}`);
    const html = await response.text();
    const currentTitle =
      seoWaveOneArticles2026.find((article) => article.slug === slug)?.post.title ?? title;

    expect(response.ok()).toBeTruthy();
    expect(html).toContain(currentTitle);
    expect(html).toContain('/skills/Pramod/playwright-cli');
    expect(html).toContain('Back to Blog');
  });
}

for (const { slug, post } of seoWaveOneArticles2026) {
  test(`SEO wave article contract renders: ${slug}`, async ({ request }) => {
    const response = await request.get(`/blog/${slug}`);
    const html = await response.text();

    expect(response.ok()).toBeTruthy();
    expect(html).toContain(post.title);
    expect(html).toContain(`https://qaskills.sh/blog/${slug}`);
    expect(html).toContain('"@type":"BlogPosting"');
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain('"wordCount":');
    expect(html).toContain('Pramod Dutta');
    expect(html).toContain('The Testing Academy');
    expect(html).toContain('Primary sources');
    expect(html).toContain('data-testid="article-sources"');
    expect(html).toContain('data-testid="topic-cluster"');
    expect(html).toContain('/skills/Pramod/playwright-cli');
    expect(html).toContain(post.image!);
    expect(html).toContain(post.imageAlt!);
  });
}

for (const { slug, post } of articleFactoryBatch20260718Posts) {
  test(`article factory post-flow renders: ${slug}`, async ({ request }) => {
    const response = await request.get(`/blog/${slug}`);
    const html = await response.text();

    expect(response.ok()).toBeTruthy();
    expect(html).toContain(post.title);
    expect(html).toContain(`https://qaskills.sh/blog/${slug}`);
    expect(html).toContain('"@type":"BlogPosting"');
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('"wordCount":');
    expect(html).toContain('Pramod Dutta');
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1);
    expect(html).toContain('Primary sources');
    expect(html).toContain('data-testid="article-sources"');
    expect(html).toMatch(
      /\/skills\/thetestingacademy\/(?:ai-release-guardian|secure-test-data-engineer)/,
    );
  });
}

for (const { slug, post } of seoWaveOneArticles2026.filter(
  ({ post }) => post.contentKind === 'pillar',
)) {
  test(`SEO pillar renders in a real browser: ${slug}`, async ({ page }) => {
    await page.goto(`/blog/${slug}`);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(post.title);
    await expect(page.getByTestId('article-sources')).toBeVisible();
    await expect(page.getByTestId('topic-cluster')).toBeVisible();
    await expect(page.locator('article img')).toHaveAttribute('alt', post.imageAlt!);
  });
}
