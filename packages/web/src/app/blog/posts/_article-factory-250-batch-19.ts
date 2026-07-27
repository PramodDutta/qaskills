import type { BlogPost } from './index';

import { post as skillMdCrlfParserCompatibility } from './skill-md-crlf-parser-compatibility';
import { post as skillMdParserDefaultMasking } from './skill-md-parser-default-masking';
import { post as skillMdQualityScoreParity } from './skill-md-quality-score-parity';
import { post as skillMdTaxonomyAllowlistValidation } from './skill-md-taxonomy-allowlist-validation';
import { post as skillMdTokenEstimateCalibration } from './skill-md-token-estimate-calibration';

export const articleFactory250Batch19Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'skill-md-parser-default-masking',
    post: skillMdParserDefaultMasking,
  },
  {
    slug: 'skill-md-token-estimate-calibration',
    post: skillMdTokenEstimateCalibration,
  },
  {
    slug: 'skill-md-crlf-parser-compatibility',
    post: skillMdCrlfParserCompatibility,
  },
  {
    slug: 'skill-md-taxonomy-allowlist-validation',
    post: skillMdTaxonomyAllowlistValidation,
  },
  {
    slug: 'skill-md-quality-score-parity',
    post: skillMdQualityScoreParity,
  },
];
