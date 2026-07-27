import type { BlogPost } from './index';

import { post as emptyReviewStatisticsContractTesting } from './empty-review-statistics-contract-testing';
import { post as installTelemetryCountryHeaderTesting } from './install-telemetry-country-header-testing';
import { post as postgresCascadeDeleteRelationTesting } from './postgres-cascade-delete-relation-testing';
import { post as reviewRatingBoundaryValidationTesting } from './review-rating-boundary-validation-testing';
import { post as typesenseCollectionSchemaDriftTesting } from './typesense-collection-schema-drift-testing';

export const articleFactory250Batch14Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'empty-review-statistics-contract-testing',
    post: emptyReviewStatisticsContractTesting,
  },
  {
    slug: 'review-rating-boundary-validation-testing',
    post: reviewRatingBoundaryValidationTesting,
  },
  {
    slug: 'postgres-cascade-delete-relation-testing',
    post: postgresCascadeDeleteRelationTesting,
  },
  {
    slug: 'typesense-collection-schema-drift-testing',
    post: typesenseCollectionSchemaDriftTesting,
  },
  {
    slug: 'install-telemetry-country-header-testing',
    post: installTelemetryCountryHeaderTesting,
  },
];
