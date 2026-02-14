import type { MetadataRoute } from 'next';
import { db } from '@/db';
import { skills, users } from '@/db/schema';

const baseUrl = 'https://qaskills.sh';

const staticPages: MetadataRoute.Sitemap = [
  { url: baseUrl, lastModified: '2026-02-14' },
  { url: `${baseUrl}/skills`, lastModified: '2026-02-14' },
  { url: `${baseUrl}/getting-started`, lastModified: '2026-02-14' },
  { url: `${baseUrl}/leaderboard`, lastModified: '2026-02-14' },
  { url: `${baseUrl}/packs`, lastModified: '2026-02-14' },
  { url: `${baseUrl}/pricing`, lastModified: '2026-02-14' },
  { url: `${baseUrl}/how-to-publish`, lastModified: '2026-02-14' },
  { url: `${baseUrl}/blog`, lastModified: '2026-02-14' },
  { url: `${baseUrl}/faq`, lastModified: '2026-02-14' },
  { url: `${baseUrl}/about`, lastModified: '2026-02-14' },
  { url: `${baseUrl}/contact`, lastModified: '2026-02-14' },
  { url: `${baseUrl}/terms`, lastModified: '2026-02-14' },
  { url: `${baseUrl}/privacy`, lastModified: '2026-02-14' },
  { url: `${baseUrl}/refund-policy`, lastModified: '2026-02-14' },
  // Index pages
  { url: `${baseUrl}/agents`, lastModified: '2026-02-14' },
  { url: `${baseUrl}/categories`, lastModified: '2026-02-14' },
  { url: `${baseUrl}/compare`, lastModified: '2026-02-14' },
  // Agent pages
  { url: `${baseUrl}/agents/claude-code`, lastModified: '2026-02-14' },
  { url: `${baseUrl}/agents/cursor`, lastModified: '2026-02-14' },
  { url: `${baseUrl}/agents/copilot`, lastModified: '2026-02-14' },
  { url: `${baseUrl}/agents/windsurf`, lastModified: '2026-02-14' },
  { url: `${baseUrl}/agents/cline`, lastModified: '2026-02-14' },
  // Category pages
  { url: `${baseUrl}/categories/e2e-testing`, lastModified: '2026-02-14' },
  { url: `${baseUrl}/categories/unit-testing`, lastModified: '2026-02-14' },
  { url: `${baseUrl}/categories/api-testing`, lastModified: '2026-02-14' },
  { url: `${baseUrl}/categories/performance-testing`, lastModified: '2026-02-14' },
  { url: `${baseUrl}/categories/accessibility-testing`, lastModified: '2026-02-14' },
  // Comparison pages
  { url: `${baseUrl}/compare/qaskills-vs-skillsmp`, lastModified: '2026-02-14' },
  { url: `${baseUrl}/compare/playwright-vs-cypress-skills`, lastModified: '2026-02-14' },
];

const blogPosts = [
  { slug: 'introducing-qaskills', date: '2025-12-01' },
  { slug: 'playwright-e2e-best-practices', date: '2025-12-15' },
  { slug: 'ai-agents-qa-revolution', date: '2026-01-10' },
];

const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
  url: `${baseUrl}/blog/${post.slug}`,
  lastModified: new Date(post.date),
}));

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const allSkills = await db
      .select({ slug: skills.slug, authorName: skills.authorName, updatedAt: skills.updatedAt })
      .from(skills);

    const skillPages: MetadataRoute.Sitemap = allSkills.map((skill) => ({
      url: `${baseUrl}/skills/${skill.authorName}/${skill.slug}`,
      lastModified: skill.updatedAt,
    }));

    const allUsers = await db
      .select({ username: users.username, updatedAt: users.updatedAt })
      .from(users);

    const userPages: MetadataRoute.Sitemap = allUsers.map((user) => ({
      url: `${baseUrl}/users/${user.username}`,
      lastModified: user.updatedAt,
    }));

    return [...staticPages, ...skillPages, ...userPages, ...blogPages];
  } catch {
    // Fallback to static pages only when DB is not available
    return [...staticPages, ...blogPages];
  }
}
