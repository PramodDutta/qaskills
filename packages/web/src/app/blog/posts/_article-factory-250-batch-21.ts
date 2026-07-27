import type { BlogPost } from './index';

import { post as skillMdAgentCompletenessThresholds } from './skill-md-agent-completeness-thresholds';
import { post as skillMdDuplicateListValueValidation } from './skill-md-duplicate-list-value-validation';
import { post as skillMdSemanticVersionCompatibility } from './skill-md-semantic-version-compatibility';
import { post as skillMdUnknownFieldHandling } from './skill-md-unknown-field-handling';
import { post as skillMdValidatorJsonContract } from './skill-md-validator-json-contract';

export const articleFactory250Batch21Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'skill-md-agent-completeness-thresholds',
    post: skillMdAgentCompletenessThresholds,
  },
  {
    slug: 'skill-md-validator-json-contract',
    post: skillMdValidatorJsonContract,
  },
  {
    slug: 'skill-md-semantic-version-compatibility',
    post: skillMdSemanticVersionCompatibility,
  },
  {
    slug: 'skill-md-unknown-field-handling',
    post: skillMdUnknownFieldHandling,
  },
  {
    slug: 'skill-md-duplicate-list-value-validation',
    post: skillMdDuplicateListValueValidation,
  },
];
