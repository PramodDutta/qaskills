import type { MetadataRoute } from 'next';
import { db } from '@/db';
import { skills } from '@/db/schema';

const baseUrl = 'https://qaskills.sh';

const staticPages: MetadataRoute.Sitemap = [
  { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
  { url: `${baseUrl}/skills`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  { url: `${baseUrl}/getting-started`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.85 },
  { url: `${baseUrl}/leaderboard`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
  { url: `${baseUrl}/packs`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
  { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
];

const blogSlugs = [
  'introducing-qaskills',
  'playwright-e2e-best-practices',
  'ai-agents-qa-revolution',
];

const blogPages: MetadataRoute.Sitemap = blogSlugs.map((slug) => ({
  url: `${baseUrl}/blog/${slug}`,
  lastModified: new Date(),
  changeFrequency: 'monthly',
  priority: 0.6,
}));

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const allSkills = await db
      .select({ slug: skills.slug, authorName: skills.authorName, updatedAt: skills.updatedAt })
      .from(skills);

    const skillPages: MetadataRoute.Sitemap = allSkills.map((skill) => ({
      url: `${baseUrl}/skills/${skill.authorName}/${skill.slug}`,
      lastModified: skill.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    return [...staticPages, ...skillPages, ...blogPages];
  } catch {
    // Fallback to static pages only when DB is not available
    return [...staticPages, ...blogPages];
  }
}
