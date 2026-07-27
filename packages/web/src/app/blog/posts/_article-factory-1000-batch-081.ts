import type { BlogPost } from './index';

import { post as llmDiscriminatedUnionOutputTesting } from './llm-discriminated-union-output-testing';
import { post as llmJudgeReferenceLeakageTesting } from './llm-judge-reference-leakage-testing';
import { post as llmLanguageQualityDriftTesting } from './llm-language-quality-drift-testing';
import { post as llmLatencyDistributionDriftTesting } from './llm-latency-distribution-drift-testing';
import { post as llmOrphanToolSpanDetection } from './llm-orphan-tool-span-detection';

export const articleFactory1000Batch081Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'llm-discriminated-union-output-testing',
    post: llmDiscriminatedUnionOutputTesting,
  },
  {
    slug: 'llm-judge-reference-leakage-testing',
    post: llmJudgeReferenceLeakageTesting,
  },
  {
    slug: 'llm-language-quality-drift-testing',
    post: llmLanguageQualityDriftTesting,
  },
  {
    slug: 'llm-latency-distribution-drift-testing',
    post: llmLatencyDistributionDriftTesting,
  },
  {
    slug: 'llm-orphan-tool-span-detection',
    post: llmOrphanToolSpanDetection,
  },
];
