import type { MetadataRoute } from 'next';
import { db } from '@/db';
import { skills, users } from '@/db/schema';
import { postList } from './blog/posts';

const baseUrl = 'https://qaskills.sh';
const today = '2026-02-23';

const staticPages: MetadataRoute.Sitemap = [
  { url: baseUrl, lastModified: today, changeFrequency: 'daily', priority: 1.0 },
  { url: `${baseUrl}/skills`, lastModified: today, changeFrequency: 'daily', priority: 0.9 },
  { url: `${baseUrl}/blog`, lastModified: today, changeFrequency: 'daily', priority: 0.9 },
  { url: `${baseUrl}/getting-started`, lastModified: today, changeFrequency: 'weekly', priority: 0.8 },
  { url: `${baseUrl}/leaderboard`, lastModified: today, changeFrequency: 'daily', priority: 0.7 },
  { url: `${baseUrl}/packs`, lastModified: today, changeFrequency: 'weekly', priority: 0.7 },
  { url: `${baseUrl}/pricing`, lastModified: today, changeFrequency: 'monthly', priority: 0.6 },
  { url: `${baseUrl}/how-to-publish`, lastModified: today, changeFrequency: 'weekly', priority: 0.7 },
  { url: `${baseUrl}/faq`, lastModified: today, changeFrequency: 'weekly', priority: 0.6 },
  { url: `${baseUrl}/about`, lastModified: today, changeFrequency: 'monthly', priority: 0.5 },
  { url: `${baseUrl}/contact`, lastModified: today, changeFrequency: 'monthly', priority: 0.4 },
  { url: `${baseUrl}/terms`, lastModified: today, changeFrequency: 'yearly', priority: 0.3 },
  { url: `${baseUrl}/privacy`, lastModified: today, changeFrequency: 'yearly', priority: 0.3 },
  { url: `${baseUrl}/refund-policy`, lastModified: today, changeFrequency: 'yearly', priority: 0.3 },
  // Index pages
  { url: `${baseUrl}/agents`, lastModified: today, changeFrequency: 'weekly', priority: 0.8 },
  { url: `${baseUrl}/categories`, lastModified: today, changeFrequency: 'weekly', priority: 0.8 },
  { url: `${baseUrl}/compare`, lastModified: today, changeFrequency: 'weekly', priority: 0.8 },
  // Agent pages
  { url: `${baseUrl}/agents/claude-code`, lastModified: today, changeFrequency: 'weekly', priority: 0.7 },
  { url: `${baseUrl}/agents/cursor`, lastModified: today, changeFrequency: 'weekly', priority: 0.7 },
  { url: `${baseUrl}/agents/copilot`, lastModified: today, changeFrequency: 'weekly', priority: 0.7 },
  { url: `${baseUrl}/agents/windsurf`, lastModified: today, changeFrequency: 'weekly', priority: 0.7 },
  { url: `${baseUrl}/agents/cline`, lastModified: today, changeFrequency: 'weekly', priority: 0.7 },
  // Category pages
  { url: `${baseUrl}/categories/e2e-testing`, lastModified: today, changeFrequency: 'weekly', priority: 0.7 },
  { url: `${baseUrl}/categories/unit-testing`, lastModified: today, changeFrequency: 'weekly', priority: 0.7 },
  { url: `${baseUrl}/categories/api-testing`, lastModified: today, changeFrequency: 'weekly', priority: 0.7 },
  { url: `${baseUrl}/categories/performance-testing`, lastModified: today, changeFrequency: 'weekly', priority: 0.7 },
  { url: `${baseUrl}/categories/accessibility-testing`, lastModified: today, changeFrequency: 'weekly', priority: 0.7 },
  // Comparison pages
  { url: `${baseUrl}/compare/qaskills-vs-skillsmp`, lastModified: today, changeFrequency: 'monthly', priority: 0.7 },
  { url: `${baseUrl}/compare/playwright-vs-cypress-skills`, lastModified: today, changeFrequency: 'monthly', priority: 0.7 },
];

// Auto-generate blog pages from the posts index (no more manual sync needed)
const blogPages: MetadataRoute.Sitemap = postList.map((post) => ({
  url: `${baseUrl}/blog/${post.slug}`,
  lastModified: new Date(post.date),
  changeFrequency: 'monthly' as const,
  priority: 0.8,
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
