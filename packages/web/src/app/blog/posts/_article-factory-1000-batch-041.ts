import type { BlogPost } from './index';

import { post as rankingTabAnalyticsPayloadTests } from './ranking-tab-analytics-payload-tests';
import { post as rankingTopThreeStylePriority } from './ranking-top-three-style-priority';
import { post as typesenseEmptyHitMappingTests } from './typesense-empty-hit-mapping-tests';
import { post as reactEmailPreviewTextContracts } from './react-email-preview-text-contracts';
import { post as reactEmailSemanticHtmlTests } from './react-email-semantic-html-tests';

export const articleFactory1000Batch041Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'ranking-tab-analytics-payload-tests',
    post: rankingTabAnalyticsPayloadTests,
  },
  {
    slug: 'ranking-top-three-style-priority',
    post: rankingTopThreeStylePriority,
  },
  {
    slug: 'typesense-empty-hit-mapping-tests',
    post: typesenseEmptyHitMappingTests,
  },
  {
    slug: 'react-email-preview-text-contracts',
    post: reactEmailPreviewTextContracts,
  },
  {
    slug: 'react-email-semantic-html-tests',
    post: reactEmailSemanticHtmlTests,
  },
];
