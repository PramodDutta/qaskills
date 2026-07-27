import type { BlogPost } from './index';

import { post as gherkinScenarioOutlineBoundaryTables } from './gherkin-scenario-outline-boundary-tables';
import { post as givenWhenThenTransitionClarity } from './given-when-then-transition-clarity';
import { post as goBenchmarkRunparallelCorrectness } from './go-benchmark-runparallel-correctness';
import { post as rspecAggregateFailuresScope } from './rspec-aggregate-failures-scope';
import { post as rspecAroundHookOrdering } from './rspec-around-hook-ordering';

export const articleFactory1000Batch130Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'gherkin-scenario-outline-boundary-tables',
    post: gherkinScenarioOutlineBoundaryTables,
  },
  {
    slug: 'given-when-then-transition-clarity',
    post: givenWhenThenTransitionClarity,
  },
  {
    slug: 'go-benchmark-runparallel-correctness',
    post: goBenchmarkRunparallelCorrectness,
  },
  {
    slug: 'rspec-aggregate-failures-scope',
    post: rspecAggregateFailuresScope,
  },
  {
    slug: 'rspec-around-hook-ordering',
    post: rspecAroundHookOrdering,
  },
];
