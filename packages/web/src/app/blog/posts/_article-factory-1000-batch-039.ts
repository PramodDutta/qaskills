import type { BlogPost } from './index';

import { post as publishButtonValidityStateTests } from './publish-button-validity-state-tests';
import { post as publishWizardStepGatingTests } from './publish-wizard-step-gating-tests';
import { post as skillMarkdownHeadingHierarchyTests } from './skill-markdown-heading-hierarchy-tests';
import { post as questionAnswerMarkdownHeadingParserTests } from './question-answer-markdown-heading-parser-tests';
import { post as rankingAllTabCleanUrlTests } from './ranking-all-tab-clean-url-tests';

export const articleFactory1000Batch039Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'publish-button-validity-state-tests',
    post: publishButtonValidityStateTests,
  },
  {
    slug: 'publish-wizard-step-gating-tests',
    post: publishWizardStepGatingTests,
  },
  {
    slug: 'skill-markdown-heading-hierarchy-tests',
    post: skillMarkdownHeadingHierarchyTests,
  },
  {
    slug: 'question-answer-markdown-heading-parser-tests',
    post: questionAnswerMarkdownHeadingParserTests,
  },
  {
    slug: 'ranking-all-tab-clean-url-tests',
    post: rankingAllTabCleanUrlTests,
  },
];
