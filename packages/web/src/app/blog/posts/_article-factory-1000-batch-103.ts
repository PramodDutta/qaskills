import type { BlogPost } from './index';

import { post as k6ScenarioExecutorFairnessTesting } from './k6-scenario-executor-fairness-testing';
import { post as loadTestWarmupExclusionAnalysis } from './load-test-warmup-exclusion-analysis';
import { post as opentelemetryLogTraceCorrelationTesting } from './opentelemetry-log-trace-correlation-testing';
import { post as pdfReadingOrderRegressionTesting } from './pdf-reading-order-regression-testing';
import { post as jwtAlgorithmConfusionRejectionTesting } from './jwt-algorithm-confusion-rejection-testing';

export const articleFactory1000Batch103Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'k6-scenario-executor-fairness-testing',
    post: k6ScenarioExecutorFairnessTesting,
  },
  {
    slug: 'load-test-warmup-exclusion-analysis',
    post: loadTestWarmupExclusionAnalysis,
  },
  {
    slug: 'opentelemetry-log-trace-correlation-testing',
    post: opentelemetryLogTraceCorrelationTesting,
  },
  {
    slug: 'pdf-reading-order-regression-testing',
    post: pdfReadingOrderRegressionTesting,
  },
  {
    slug: 'jwt-algorithm-confusion-rejection-testing',
    post: jwtAlgorithmConfusionRejectionTesting,
  },
];
