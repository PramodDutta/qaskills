import type { BlogPost } from './index';

import { post as dynamicPackAggregateInstallCountTests } from './dynamic-pack-aggregate-install-count-tests';
import { post as editorValidationIssueOrderingTests } from './editor-validation-issue-ordering-tests';
import { post as packDatabaseFallbackSelectionTests } from './pack-database-fallback-selection-tests';
import { post as skillMdEditorDebounceValidationTests } from './skill-md-editor-debounce-validation-tests';
import { post as emailTemplateAccessibleCtaTests } from './email-template-accessible-cta-tests';

export const articleFactory1000Batch034Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'dynamic-pack-aggregate-install-count-tests',
    post: dynamicPackAggregateInstallCountTests,
  },
  {
    slug: 'editor-validation-issue-ordering-tests',
    post: editorValidationIssueOrderingTests,
  },
  {
    slug: 'pack-database-fallback-selection-tests',
    post: packDatabaseFallbackSelectionTests,
  },
  {
    slug: 'skill-md-editor-debounce-validation-tests',
    post: skillMdEditorDebounceValidationTests,
  },
  {
    slug: 'email-template-accessible-cta-tests',
    post: emailTemplateAccessibleCtaTests,
  },
];
