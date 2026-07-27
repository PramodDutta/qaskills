import type { BlogPost } from './index';

import { post as voiceAgentBackgroundNoiseTesting } from './voice-agent-background-noise-testing';
import { post as voiceAgentBargeInTesting } from './voice-agent-barge-in-testing';
import { post as voiceAgentSilenceTimeoutTesting } from './voice-agent-silence-timeout-testing';
import { post as agentCheckpointResumeTesting } from './agent-checkpoint-resume-testing';
import { post as llmNullableFieldContractTesting } from './llm-nullable-field-contract-testing';

export const articleFactory1000Batch095Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'voice-agent-background-noise-testing',
    post: voiceAgentBackgroundNoiseTesting,
  },
  {
    slug: 'voice-agent-barge-in-testing',
    post: voiceAgentBargeInTesting,
  },
  {
    slug: 'voice-agent-silence-timeout-testing',
    post: voiceAgentSilenceTimeoutTesting,
  },
  {
    slug: 'agent-checkpoint-resume-testing',
    post: agentCheckpointResumeTesting,
  },
  {
    slug: 'llm-nullable-field-contract-testing',
    post: llmNullableFieldContractTesting,
  },
];
