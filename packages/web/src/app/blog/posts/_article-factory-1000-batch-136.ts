import type { BlogPost } from './index';

import { post as junitCustomExecutionConditionTesting } from './junit-custom-execution-condition-testing';
import { post as junitDynamicTestLifecycleLimits } from './junit-dynamic-test-lifecycle-limits';
import { post as junitExtensionOrderingRules } from './junit-extension-ordering-rules';
import { post as junitNestedConfigurationInheritance } from './junit-nested-configuration-inheritance';
import { post as testngSoftAssertLifecycle } from './testng-soft-assert-lifecycle';

export const articleFactory1000Batch136Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'junit-custom-execution-condition-testing',
    post: junitCustomExecutionConditionTesting,
  },
  {
    slug: 'junit-dynamic-test-lifecycle-limits',
    post: junitDynamicTestLifecycleLimits,
  },
  {
    slug: 'junit-extension-ordering-rules',
    post: junitExtensionOrderingRules,
  },
  {
    slug: 'junit-nested-configuration-inheritance',
    post: junitNestedConfigurationInheritance,
  },
  {
    slug: 'testng-soft-assert-lifecycle',
    post: testngSoftAssertLifecycle,
  },
];
