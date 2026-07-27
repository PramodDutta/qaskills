import type { BlogPost } from './index';

import { post as algebraicPropertyAssumptionTesting } from './algebraic-property-assumption-testing';
import { post as allureCategoryRegexPrecedence } from './allure-category-regex-precedence';
import { post as allureHistoryIdentityStability } from './allure-history-identity-stability';
import { post as referentialTestDatasetSubsetting } from './referential-test-dataset-subsetting';
import { post as bddStepAmbiguityPrevention } from './bdd-step-ambiguity-prevention';

export const articleFactory1000Batch126Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'algebraic-property-assumption-testing',
    post: algebraicPropertyAssumptionTesting,
  },
  {
    slug: 'allure-category-regex-precedence',
    post: allureCategoryRegexPrecedence,
  },
  {
    slug: 'allure-history-identity-stability',
    post: allureHistoryIdentityStability,
  },
  {
    slug: 'referential-test-dataset-subsetting',
    post: referentialTestDatasetSubsetting,
  },
  {
    slug: 'bdd-step-ambiguity-prevention',
    post: bddStepAmbiguityPrevention,
  },
];
