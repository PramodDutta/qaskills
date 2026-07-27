import type { BlogPost } from './index';

import { post as jmeterCsvSharingModeTesting } from './jmeter-csv-sharing-mode-testing';
import { post as phpunitAttributeAnnotationPrecedence } from './phpunit-attribute-annotation-precedence';
import { post as phpunitCallbackConsecutiveCallAssertions } from './phpunit-callback-consecutive-call-assertions';
import { post as phpunitCustomComparatorRegistration } from './phpunit-custom-comparator-registration';
import { post as phpunitDependencyCloneSemantics } from './phpunit-dependency-clone-semantics';

export const articleFactory1000Batch145Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'jmeter-csv-sharing-mode-testing',
    post: jmeterCsvSharingModeTesting,
  },
  {
    slug: 'phpunit-attribute-annotation-precedence',
    post: phpunitAttributeAnnotationPrecedence,
  },
  {
    slug: 'phpunit-callback-consecutive-call-assertions',
    post: phpunitCallbackConsecutiveCallAssertions,
  },
  {
    slug: 'phpunit-custom-comparator-registration',
    post: phpunitCustomComparatorRegistration,
  },
  {
    slug: 'phpunit-dependency-clone-semantics',
    post: phpunitDependencyCloneSemantics,
  },
];
