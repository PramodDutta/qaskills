import type { BlogPost } from './index';

import { post as roadmapQueryPhaseExpansionTests } from './roadmap-query-phase-expansion-tests';
import { post as roadmapSearchFilterIntersectionTests } from './roadmap-search-filter-intersection-tests';
import { post as roadmapSitemapDetailUrlTests } from './roadmap-sitemap-detail-url-tests';
import { post as roadmapStaleMilestonePruningTests } from './roadmap-stale-milestone-pruning-tests';
import { post as robotsAiCrawlerParityTests } from './robots-ai-crawler-parity-tests';

export const articleFactory1000Batch047Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'roadmap-query-phase-expansion-tests',
    post: roadmapQueryPhaseExpansionTests,
  },
  {
    slug: 'roadmap-search-filter-intersection-tests',
    post: roadmapSearchFilterIntersectionTests,
  },
  {
    slug: 'roadmap-sitemap-detail-url-tests',
    post: roadmapSitemapDetailUrlTests,
  },
  {
    slug: 'roadmap-stale-milestone-pruning-tests',
    post: roadmapStaleMilestonePruningTests,
  },
  {
    slug: 'robots-ai-crawler-parity-tests',
    post: robotsAiCrawlerParityTests,
  },
];
