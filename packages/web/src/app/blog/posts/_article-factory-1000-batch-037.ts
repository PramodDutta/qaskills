import type { BlogPost } from './index';

import { post as installCommandAnalyticsSequenceTests } from './install-command-analytics-sequence-tests';
import { post as installCommandClipboardTimerTests } from './install-command-clipboard-timer-tests';
import { post as installEventTypePersistenceTests } from './install-event-type-persistence-tests';
import { post as installGuideUnknownAgentFiltering } from './install-guide-unknown-agent-filtering';
import { post as markdownAdSplitCodeFenceTests } from './markdown-ad-split-code-fence-tests';

export const articleFactory1000Batch037Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'install-command-analytics-sequence-tests',
    post: installCommandAnalyticsSequenceTests,
  },
  {
    slug: 'install-command-clipboard-timer-tests',
    post: installCommandClipboardTimerTests,
  },
  {
    slug: 'install-event-type-persistence-tests',
    post: installEventTypePersistenceTests,
  },
  {
    slug: 'install-guide-unknown-agent-filtering',
    post: installGuideUnknownAgentFiltering,
  },
  {
    slug: 'markdown-ad-split-code-fence-tests',
    post: markdownAdSplitCodeFenceTests,
  },
];
