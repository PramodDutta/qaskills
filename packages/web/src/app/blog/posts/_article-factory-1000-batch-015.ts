import type { BlogPost } from './index';

import { post as qaskillsJestProjectDetection } from './qaskills-jest-project-detection';
import { post as qaskillsDestinationFileConflictTesting } from './qaskills-destination-file-conflict-testing';
import { post as qaskillsDestinationStaleFileCleanup } from './qaskills-destination-stale-file-cleanup';
import { post as qaskillsDetailIdentifierResolutionMatrix } from './qaskills-detail-identifier-resolution-matrix';
import { post as qaskillsDetectedPathWriteParity } from './qaskills-detected-path-write-parity';

export const articleFactory1000Batch015Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'qaskills-jest-project-detection',
    post: qaskillsJestProjectDetection,
  },
  {
    slug: 'qaskills-destination-file-conflict-testing',
    post: qaskillsDestinationFileConflictTesting,
  },
  {
    slug: 'qaskills-destination-stale-file-cleanup',
    post: qaskillsDestinationStaleFileCleanup,
  },
  {
    slug: 'qaskills-detail-identifier-resolution-matrix',
    post: qaskillsDetailIdentifierResolutionMatrix,
  },
  {
    slug: 'qaskills-detected-path-write-parity',
    post: qaskillsDetectedPathWriteParity,
  },
];
