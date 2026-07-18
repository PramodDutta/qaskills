import type { BlogPost } from './index';
import { post as partialUniqueIndexNegativeTests } from './partial-unique-index-negative-tests-soft-delete';
import { post as databaseDefaultsGeneratedColumns } from './test-database-defaults-generated-columns-triggers';
import { post as compositeUniqueConstraintData } from './composite-unique-constraint-test-data-matrix';
import { post as openApiOneOfNegativeData } from './openapi-oneof-discriminator-negative-test-data';
import { post as schemaDerivedDateTimeData } from './schema-derived-date-time-boundary-test-data';

export const articleFactorySchemaBoundariesPosts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'partial-unique-index-negative-tests-soft-delete',
    post: partialUniqueIndexNegativeTests,
  },
  {
    slug: 'test-database-defaults-generated-columns-triggers',
    post: databaseDefaultsGeneratedColumns,
  },
  {
    slug: 'composite-unique-constraint-test-data-matrix',
    post: compositeUniqueConstraintData,
  },
  {
    slug: 'openapi-oneof-discriminator-negative-test-data',
    post: openApiOneOfNegativeData,
  },
  {
    slug: 'schema-derived-date-time-boundary-test-data',
    post: schemaDerivedDateTimeData,
  },
];
