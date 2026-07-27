import type { BlogPost } from './index';

import { post as alertmanagerInhibitionDependencyTesting } from './alertmanager-inhibition-dependency-testing';
import { post as androidAppLinksVerificationTesting } from './android-app-links-verification-testing';
import { post as androidPredictiveBackGestureTesting } from './android-predictive-back-gesture-testing';
import { post as androidScopedStorageMigrationTesting } from './android-scoped-storage-migration-testing';
import { post as pciCardDataRetentionTesting } from './pci-card-data-retention-testing';

export const articleFactory1000Batch119Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'alertmanager-inhibition-dependency-testing',
    post: alertmanagerInhibitionDependencyTesting,
  },
  {
    slug: 'android-app-links-verification-testing',
    post: androidAppLinksVerificationTesting,
  },
  {
    slug: 'android-predictive-back-gesture-testing',
    post: androidPredictiveBackGestureTesting,
  },
  {
    slug: 'android-scoped-storage-migration-testing',
    post: androidScopedStorageMigrationTesting,
  },
  {
    slug: 'pci-card-data-retention-testing',
    post: pciCardDataRetentionTesting,
  },
];
