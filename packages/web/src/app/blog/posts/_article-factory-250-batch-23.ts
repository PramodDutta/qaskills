import type { BlogPost } from './index';

import { post as agentSkillPackageSbomGeneration } from './agent-skill-package-sbom-generation';
import { post as skillMd500LineBoundary } from './skill-md-500-line-boundary';
import { post as skillMdByteOrderMarkHandling } from './skill-md-byte-order-mark-handling';
import { post as skillMdFileErrorDiagnostics } from './skill-md-file-error-diagnostics';
import { post as skillMdWhitespaceOnlyMetadata } from './skill-md-whitespace-only-metadata';

export const articleFactory250Batch23Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'skill-md-whitespace-only-metadata',
    post: skillMdWhitespaceOnlyMetadata,
  },
  {
    slug: 'skill-md-500-line-boundary',
    post: skillMd500LineBoundary,
  },
  {
    slug: 'skill-md-file-error-diagnostics',
    post: skillMdFileErrorDiagnostics,
  },
  {
    slug: 'agent-skill-package-sbom-generation',
    post: agentSkillPackageSbomGeneration,
  },
  {
    slug: 'skill-md-byte-order-mark-handling',
    post: skillMdByteOrderMarkHandling,
  },
];
