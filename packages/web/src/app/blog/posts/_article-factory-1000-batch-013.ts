import type { BlogPost } from './index';

import { post as qaskillsWindowsDrivePathClassification } from './qaskills-windows-drive-path-classification';
import { post as qaskillsZeroByteSkillDetection } from './qaskills-zero-byte-skill-detection';
import { post as qaskillsSeleniumProjectDetection } from './qaskills-selenium-project-detection';
import { post as qaskillsUpdateOneSkillAgents } from './qaskills-update-one-skill-agents';
import { post as qaskillsConcurrentDownloadIsolationTests } from './qaskills-concurrent-download-isolation-tests';

export const articleFactory1000Batch013Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'qaskills-windows-drive-path-classification',
    post: qaskillsWindowsDrivePathClassification,
  },
  {
    slug: 'qaskills-zero-byte-skill-detection',
    post: qaskillsZeroByteSkillDetection,
  },
  {
    slug: 'qaskills-selenium-project-detection',
    post: qaskillsSeleniumProjectDetection,
  },
  {
    slug: 'qaskills-update-one-skill-agents',
    post: qaskillsUpdateOneSkillAgents,
  },
  {
    slug: 'qaskills-concurrent-download-isolation-tests',
    post: qaskillsConcurrentDownloadIsolationTests,
  },
];
