import type { BlogPost } from './index';

import { post as redTeamRemediationReplayTesting } from './red-team-remediation-replay-testing';
import { post as visionLlmChartLabelGrounding } from './vision-llm-chart-label-grounding';
import { post as voiceAgentInterruptionRecoveryTesting } from './voice-agent-interruption-recovery-testing';
import { post as voiceAgentTurnDetectionTesting } from './voice-agent-turn-detection-testing';
import { post as agentDataExfiltrationUrlTesting } from './agent-data-exfiltration-url-testing';

export const articleFactory1000Batch085Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'red-team-remediation-replay-testing',
    post: redTeamRemediationReplayTesting,
  },
  {
    slug: 'vision-llm-chart-label-grounding',
    post: visionLlmChartLabelGrounding,
  },
  {
    slug: 'voice-agent-interruption-recovery-testing',
    post: voiceAgentInterruptionRecoveryTesting,
  },
  {
    slug: 'voice-agent-turn-detection-testing',
    post: voiceAgentTurnDetectionTesting,
  },
  {
    slug: 'agent-data-exfiltration-url-testing',
    post: agentDataExfiltrationUrlTesting,
  },
];
