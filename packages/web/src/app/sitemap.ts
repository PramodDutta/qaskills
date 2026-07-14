import type { MetadataRoute } from 'next';
import { db } from '@/db';
import { skills, users } from '@/db/schema';
import { postList } from './blog/posts';
import { isCanonicalBlogSlug } from '@/lib/blog-canonical';
import { allComparisonSlugs } from '@/lib/compare-data';
import { allHubSlugs } from '@/lib/skills-for-hubs';
import { roadmaps } from './roadmaps/roadmap-data';

const baseUrl = 'https://qaskills.sh';

const staticPages: MetadataRoute.Sitemap = [
  { url: baseUrl, changeFrequency: 'daily', priority: 1.0 },
  { url: `${baseUrl}/skills`, changeFrequency: 'daily', priority: 0.9 },
  { url: `${baseUrl}/blog`, changeFrequency: 'daily', priority: 0.9 },
  { url: `${baseUrl}/roadmaps`, changeFrequency: 'weekly', priority: 0.8 },
  {
    url: `${baseUrl}/getting-started`,
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  { url: `${baseUrl}/leaderboard`, changeFrequency: 'daily', priority: 0.7 },
  { url: `${baseUrl}/packs`, changeFrequency: 'weekly', priority: 0.7 },
  { url: `${baseUrl}/pricing`, changeFrequency: 'monthly', priority: 0.6 },
  {
    url: `${baseUrl}/how-to-publish`,
    changeFrequency: 'weekly',
    priority: 0.7,
  },
  { url: `${baseUrl}/mcp`, changeFrequency: 'weekly', priority: 0.8 },
  { url: `${baseUrl}/faq`, changeFrequency: 'weekly', priority: 0.6 },
  { url: `${baseUrl}/about`, changeFrequency: 'monthly', priority: 0.5 },
  { url: `${baseUrl}/contact`, changeFrequency: 'monthly', priority: 0.4 },
  { url: `${baseUrl}/terms`, changeFrequency: 'yearly', priority: 0.3 },
  { url: `${baseUrl}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
  {
    url: `${baseUrl}/refund-policy`,
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  // Index pages
  { url: `${baseUrl}/agents`, changeFrequency: 'weekly', priority: 0.8 },
  { url: `${baseUrl}/categories`, changeFrequency: 'weekly', priority: 0.8 },
  { url: `${baseUrl}/compare`, changeFrequency: 'weekly', priority: 0.8 },
  // Agent pages
  {
    url: `${baseUrl}/agents/claude-code`,
    changeFrequency: 'weekly',
    priority: 0.7,
  },
  {
    url: `${baseUrl}/agents/cursor`,
    changeFrequency: 'weekly',
    priority: 0.7,
  },
  {
    url: `${baseUrl}/agents/copilot`,
    changeFrequency: 'weekly',
    priority: 0.7,
  },
  {
    url: `${baseUrl}/agents/windsurf`,
    changeFrequency: 'weekly',
    priority: 0.7,
  },
  { url: `${baseUrl}/agents/cline`, changeFrequency: 'weekly', priority: 0.7 },
  // Category pages
  {
    url: `${baseUrl}/categories/e2e-testing`,
    changeFrequency: 'weekly',
    priority: 0.7,
  },
  {
    url: `${baseUrl}/categories/unit-testing`,
    changeFrequency: 'weekly',
    priority: 0.7,
  },
  {
    url: `${baseUrl}/categories/api-testing`,
    changeFrequency: 'weekly',
    priority: 0.7,
  },
  {
    url: `${baseUrl}/categories/performance-testing`,
    changeFrequency: 'weekly',
    priority: 0.7,
  },
  {
    url: `${baseUrl}/categories/accessibility-testing`,
    changeFrequency: 'weekly',
    priority: 0.7,
  },
  // Comparison pages
  {
    url: `${baseUrl}/compare/qaskills-vs-skillsmp`,
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    url: `${baseUrl}/compare/playwright-vs-cypress-skills`,
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  // Skills-For hub index
  { url: `${baseUrl}/skills-for`, changeFrequency: 'weekly', priority: 0.8 },
];

// Auto-generate blog pages from the posts index (no more manual sync needed)
const blogPages: MetadataRoute.Sitemap = postList
  .filter((post) => isCanonicalBlogSlug(post.slug))
  .map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updated || post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

// Auto-generate programmatic comparison pages from compare-data
const comparePages: MetadataRoute.Sitemap = allComparisonSlugs().map((slug) => ({
  url: `${baseUrl}/compare/${slug}`,
  changeFrequency: 'monthly' as const,
  priority: 0.7,
}));

// Auto-generate /skills-for/<topic> hub pages from skills-for-hubs
const hubPages: MetadataRoute.Sitemap = allHubSlugs().map((slug) => ({
  url: `${baseUrl}/skills-for/${slug}`,
  changeFrequency: 'weekly' as const,
  priority: 0.8,
}));

const roadmapPages: MetadataRoute.Sitemap = roadmaps.map((roadmap) => ({
  url: `${baseUrl}/roadmaps/${roadmap.slug}`,
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

    return [
      ...staticPages,
      ...skillPages,
      ...userPages,
      ...blogPages,
      ...comparePages,
      ...hubPages,
      ...roadmapPages,
    ];
  } catch {
    // Fallback to static pages only when DB is not available
    return [...staticPages, ...blogPages, ...comparePages, ...hubPages, ...roadmapPages];
  }
}
