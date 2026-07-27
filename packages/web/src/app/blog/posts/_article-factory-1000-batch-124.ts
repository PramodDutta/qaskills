import type { BlogPost } from './index';

import { post as gatlingClosedWorkloadQueueTesting } from './gatling-closed-workload-queue-testing';
import { post as graphqlDirectiveBehaviorTesting } from './graphql-directive-behavior-testing';
import { post as graphqlInputCoercionBoundaryTesting } from './graphql-input-coercion-boundary-testing';
import { post as timeoutBudgetPropagationTesting } from './timeout-budget-propagation-testing';
import { post as tlsCertificateChainOrderTesting } from './tls-certificate-chain-order-testing';

export const articleFactory1000Batch124Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'gatling-closed-workload-queue-testing',
    post: gatlingClosedWorkloadQueueTesting,
  },
  {
    slug: 'graphql-directive-behavior-testing',
    post: graphqlDirectiveBehaviorTesting,
  },
  {
    slug: 'graphql-input-coercion-boundary-testing',
    post: graphqlInputCoercionBoundaryTesting,
  },
  {
    slug: 'timeout-budget-propagation-testing',
    post: timeoutBudgetPropagationTesting,
  },
  {
    slug: 'tls-certificate-chain-order-testing',
    post: tlsCertificateChainOrderTesting,
  },
];
