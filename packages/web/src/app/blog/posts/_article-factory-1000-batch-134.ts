import type { BlogPost } from './index';

import { post as testngAlwaysrunConfigurationSemantics } from './testng-alwaysrun-configuration-semantics';
import { post as testngDependencySkipPropagation } from './testng-dependency-skip-propagation';
import { post as testngFactoryVersusDataProvider } from './testng-factory-versus-data-provider';
import { post as testngGroupDependencyOrdering } from './testng-group-dependency-ordering';
import { post as testngInvocationCountThreadPool } from './testng-invocation-count-thread-pool';

export const articleFactory1000Batch134Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'testng-alwaysrun-configuration-semantics',
    post: testngAlwaysrunConfigurationSemantics,
  },
  {
    slug: 'testng-dependency-skip-propagation',
    post: testngDependencySkipPropagation,
  },
  {
    slug: 'testng-factory-versus-data-provider',
    post: testngFactoryVersusDataProvider,
  },
  {
    slug: 'testng-group-dependency-ordering',
    post: testngGroupDependencyOrdering,
  },
  {
    slug: 'testng-invocation-count-thread-pool',
    post: testngInvocationCountThreadPool,
  },
];
