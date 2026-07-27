import type { BlogPost } from './index';

import { post as qaskillsCliNpmBinaryTesting } from './qaskills-cli-npm-binary-testing';
import { post as qaskillsLocalSkillPathInstall } from './qaskills-local-skill-path-install';
import { post as qaskillsMalformedPackageJsonDetection } from './qaskills-malformed-package-json-detection';
import { post as qaskillsSdkBearerAuthenticationTests } from './qaskills-sdk-bearer-authentication-tests';
import { post as qaskillsUnknownAgentErrorTesting } from './qaskills-unknown-agent-error-testing';

export const articleFactory250Batch03Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'qaskills-malformed-package-json-detection',
    post: qaskillsMalformedPackageJsonDetection,
  },
  {
    slug: 'qaskills-local-skill-path-install',
    post: qaskillsLocalSkillPathInstall,
  },
  {
    slug: 'qaskills-cli-npm-binary-testing',
    post: qaskillsCliNpmBinaryTesting,
  },
  {
    slug: 'qaskills-sdk-bearer-authentication-tests',
    post: qaskillsSdkBearerAuthenticationTests,
  },
  {
    slug: 'qaskills-unknown-agent-error-testing',
    post: qaskillsUnknownAgentErrorTesting,
  },
];
