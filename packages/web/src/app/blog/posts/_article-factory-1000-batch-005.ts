import type { BlogPost } from './index';

import { post as qaskillsSdkDefaultTypeResolution } from './qaskills-sdk-default-type-resolution';
import { post as qaskillsSdkDependencyExternalizationTests } from './qaskills-sdk-dependency-externalization-tests';
import { post as qaskillsSdkErrorStatusPreservation } from './qaskills-sdk-error-status-preservation';
import { post as qaskillsSdkExportsConditionOrder } from './qaskills-sdk-exports-condition-order';
import { post as qaskillsSdkFilterSerializationParity } from './qaskills-sdk-filter-serialization-parity';

export const articleFactory1000Batch005Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'qaskills-sdk-default-type-resolution',
    post: qaskillsSdkDefaultTypeResolution,
  },
  {
    slug: 'qaskills-sdk-dependency-externalization-tests',
    post: qaskillsSdkDependencyExternalizationTests,
  },
  {
    slug: 'qaskills-sdk-error-status-preservation',
    post: qaskillsSdkErrorStatusPreservation,
  },
  {
    slug: 'qaskills-sdk-exports-condition-order',
    post: qaskillsSdkExportsConditionOrder,
  },
  {
    slug: 'qaskills-sdk-filter-serialization-parity',
    post: qaskillsSdkFilterSerializationParity,
  },
];
