import { expect, test } from '@playwright/test';

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

test('skills page responds for the most-installed sort flow', async ({
  request,
}) => {
  const response = await request.get('/skills?sort=most_installed');
  const html = await response.text();

  expect(response.ok()).toBeTruthy();
  expect(html).toContain('Browse QA Skills');
  expect(html).toContain('Search skills...');
  expect(html).toContain('Most Installed');
});

test('blog index lists the new Playwright long-tail articles', async ({ request }) => {
  const response = await request.get('/blog');
  const html = await response.text();

  expect(response.ok()).toBeTruthy();
  expect(html).toContain('QA testing insights, AI agent tips, and skill development guides');
  expect(html).toContain('Playwright Locators Best Practices in 2026');
  expect(html).toContain(
    'Playwright BrowserContext Guide for Isolated Sessions and Faster Parallel Tests',
  );
});

for (const { slug, title } of playwrightLongTailPosts) {
  test(`blog post smoke renders: ${slug}`, async ({ request }) => {
    const response = await request.get(`/blog/${slug}`);
    const html = await response.text();

    expect(response.ok()).toBeTruthy();
    expect(html).toContain(title);
    expect(html).toContain('/skills/Pramod/playwright-cli');
    expect(html).toContain('Back to Blog');
  });
}
