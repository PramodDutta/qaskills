import type { BlogPost } from './index';

import { post as llmCachedTokenTelemetryTesting } from './llm-cached-token-telemetry-testing';
import { post as llmContextUtilizationDriftTesting } from './llm-context-utilization-drift-testing';
import { post as llmFinishReasonTelemetryTesting } from './llm-finish-reason-telemetry-testing';
import { post as llmDateTimeFormatTesting } from './llm-date-time-format-testing';
import { post as llmJudgeRubricAmbiguityTesting } from './llm-judge-rubric-ambiguity-testing';

export const articleFactory1000Batch089Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'llm-cached-token-telemetry-testing',
    post: llmCachedTokenTelemetryTesting,
  },
  {
    slug: 'llm-context-utilization-drift-testing',
    post: llmContextUtilizationDriftTesting,
  },
  {
    slug: 'llm-finish-reason-telemetry-testing',
    post: llmFinishReasonTelemetryTesting,
  },
  {
    slug: 'llm-date-time-format-testing',
    post: llmDateTimeFormatTesting,
  },
  {
    slug: 'llm-judge-rubric-ambiguity-testing',
    post: llmJudgeRubricAmbiguityTesting,
  },
];
