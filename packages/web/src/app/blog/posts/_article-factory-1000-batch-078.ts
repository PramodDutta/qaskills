import type { BlogPost } from './index';

import { post as openaiGraderDisagreementTesting } from './openai-grader-disagreement-testing';
import { post as promptfooExtensionHookCleanupTesting } from './promptfoo-extension-hook-cleanup-testing';
import { post as ragasExperimentReproducibilityTesting } from './ragas-experiment-reproducibility-testing';
import { post as redTeamPluginCoverageMapping } from './red-team-plugin-coverage-mapping';
import { post as voiceAgentPartialTranscriptRevision } from './voice-agent-partial-transcript-revision';

export const articleFactory1000Batch078Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'openai-grader-disagreement-testing',
    post: openaiGraderDisagreementTesting,
  },
  {
    slug: 'promptfoo-extension-hook-cleanup-testing',
    post: promptfooExtensionHookCleanupTesting,
  },
  {
    slug: 'ragas-experiment-reproducibility-testing',
    post: ragasExperimentReproducibilityTesting,
  },
  {
    slug: 'red-team-plugin-coverage-mapping',
    post: redTeamPluginCoverageMapping,
  },
  {
    slug: 'voice-agent-partial-transcript-revision',
    post: voiceAgentPartialTranscriptRevision,
  },
];
