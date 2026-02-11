import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://qaskills.sh';

  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1 },
    { url: `${baseUrl}/skills`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${baseUrl}/leaderboard`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/packs`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
  ];

  // TODO: Dynamically generate skill pages from DB
  const skillSlugs = [
    'playwright-e2e', 'playwright-api', 'cypress-e2e', 'selenium-java', 'k6-performance',
    'jmeter-load', 'owasp-security', 'appium-mobile', 'axe-accessibility', 'test-data-generation',
    'rest-assured-api', 'jest-unit', 'pytest-patterns', 'postman-api', 'bdd-cucumber',
    'test-plan-generation', 'bug-report-writing', 'cicd-pipeline', 'visual-regression', 'contract-testing-pact',
  ];

  const skillPages = skillSlugs.map((slug) => ({
    url: `${baseUrl}/skills/thetestingacademy/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...skillPages];
}
