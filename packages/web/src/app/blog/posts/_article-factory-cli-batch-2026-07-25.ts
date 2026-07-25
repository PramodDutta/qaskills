import type { BlogPost } from './index';

import { post as qaskillsAddCustomDirectoryCi } from './qaskills-add-custom-directory-ci';
import { post as qaskillsCliDisableTelemetryDoNotTrack } from './qaskills-cli-disable-telemetry-do-not-track';
import { post as qaskillsCliDownloadFallbackGithubContentMetadata } from './qaskills-cli-download-fallback-github-content-metadata';
import { post as qaskillsCliExtractSkillPackageGithub } from './qaskills-cli-extract-skill-package-github';
import { post as qaskillsInitNonInteractiveCi } from './qaskills-init-non-interactive-ci';

export const articleFactoryCliBatch20260725Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'qaskills-cli-download-fallback-github-content-metadata',
    post: qaskillsCliDownloadFallbackGithubContentMetadata,
  },
  {
    slug: 'qaskills-cli-extract-skill-package-github',
    post: qaskillsCliExtractSkillPackageGithub,
  },
  {
    slug: 'qaskills-add-custom-directory-ci',
    post: qaskillsAddCustomDirectoryCi,
  },
  {
    slug: 'qaskills-init-non-interactive-ci',
    post: qaskillsInitNonInteractiveCi,
  },
  {
    slug: 'qaskills-cli-disable-telemetry-do-not-track',
    post: qaskillsCliDisableTelemetryDoNotTrack,
  },
];
