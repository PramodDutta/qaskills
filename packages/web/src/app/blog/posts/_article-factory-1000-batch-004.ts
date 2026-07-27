import type { BlogPost } from './index';

import { post as qaskillsSdkCategoryResponseTyping } from './qaskills-sdk-category-response-typing';
import { post as qaskillsPublishValidationErrorPaths } from './qaskills-publish-validation-error-paths';
import { post as qaskillsSdkConcurrentHeaderIsolation } from './qaskills-sdk-concurrent-header-isolation';
import { post as mcpClaudeMarkerPathDetection } from './mcp-claude-marker-path-detection';
import { post as qaskillsSdkCredentialIsolationTests } from './qaskills-sdk-credential-isolation-tests';

export const articleFactory1000Batch004Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'qaskills-sdk-category-response-typing',
    post: qaskillsSdkCategoryResponseTyping,
  },
  {
    slug: 'qaskills-publish-validation-error-paths',
    post: qaskillsPublishValidationErrorPaths,
  },
  {
    slug: 'qaskills-sdk-concurrent-header-isolation',
    post: qaskillsSdkConcurrentHeaderIsolation,
  },
  {
    slug: 'mcp-claude-marker-path-detection',
    post: mcpClaudeMarkerPathDetection,
  },
  {
    slug: 'qaskills-sdk-credential-isolation-tests',
    post: qaskillsSdkCredentialIsolationTests,
  },
];
