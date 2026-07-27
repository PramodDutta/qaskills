import type { BlogPost } from './index';

import { post as mstestDatarowParamsArrayBinding } from './mstest-datarow-params-array-binding';
import { post as mstestDynamicdataSourceValidation } from './mstest-dynamicdata-source-validation';
import { post as mstestRetryAttributeBehavior } from './mstest-retry-attribute-behavior';
import { post as mutantCategoryTestStrengthAnalysis } from './mutant-category-test-strength-analysis';
import { post as mutationOperatorAllowlistStrategy } from './mutation-operator-allowlist-strategy';

export const articleFactory1000Batch142Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'mstest-datarow-params-array-binding',
    post: mstestDatarowParamsArrayBinding,
  },
  {
    slug: 'mstest-dynamicdata-source-validation',
    post: mstestDynamicdataSourceValidation,
  },
  {
    slug: 'mstest-retry-attribute-behavior',
    post: mstestRetryAttributeBehavior,
  },
  {
    slug: 'mutant-category-test-strength-analysis',
    post: mutantCategoryTestStrengthAnalysis,
  },
  {
    slug: 'mutation-operator-allowlist-strategy',
    post: mutationOperatorAllowlistStrategy,
  },
];
