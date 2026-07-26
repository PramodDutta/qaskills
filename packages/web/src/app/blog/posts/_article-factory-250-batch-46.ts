import type { BlogPost } from './index';

import { post as contractResponseHeaderOptionalityTesting } from './contract-response-header-optionality-testing';
import { post as corsPreflightCachePolicyTesting } from './cors-preflight-cache-policy-testing';
import { post as cspNonceReuseDetectionTests } from './csp-nonce-reuse-detection-tests';
import { post as cypressDevicePixelRatioScreenshots } from './cypress-device-pixel-ratio-screenshots';
import { post as vitestModuleResetDynamicImports } from './vitest-module-reset-dynamic-imports';

export const articleFactory250Batch46Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'contract-response-header-optionality-testing',
    post: contractResponseHeaderOptionalityTesting,
  },
  {
    slug: 'cors-preflight-cache-policy-testing',
    post: corsPreflightCachePolicyTesting,
  },
  {
    slug: 'csp-nonce-reuse-detection-tests',
    post: cspNonceReuseDetectionTests,
  },
  {
    slug: 'cypress-device-pixel-ratio-screenshots',
    post: cypressDevicePixelRatioScreenshots,
  },
  {
    slug: 'vitest-module-reset-dynamic-imports',
    post: vitestModuleResetDynamicImports,
  },
];
