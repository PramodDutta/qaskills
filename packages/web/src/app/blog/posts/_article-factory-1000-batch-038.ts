import type { BlogPost } from './index';

import { post as mobileEditorPreviewSwitchTests } from './mobile-editor-preview-switch-tests';
import { post as typesenseProtocolOverrideTests } from './typesense-protocol-override-tests';
import { post as typesenseDefaultNodeConfigurationTests } from './typesense-default-node-configuration-tests';
import { post as nullableSkillAuthorRelationTests } from './nullable-skill-author-relation-tests';
import { post as skillPackItemCascadeTests } from './skill-pack-item-cascade-tests';

export const articleFactory1000Batch038Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'mobile-editor-preview-switch-tests',
    post: mobileEditorPreviewSwitchTests,
  },
  {
    slug: 'typesense-protocol-override-tests',
    post: typesenseProtocolOverrideTests,
  },
  {
    slug: 'typesense-default-node-configuration-tests',
    post: typesenseDefaultNodeConfigurationTests,
  },
  {
    slug: 'nullable-skill-author-relation-tests',
    post: nullableSkillAuthorRelationTests,
  },
  {
    slug: 'skill-pack-item-cascade-tests',
    post: skillPackItemCascadeTests,
  },
];
