import { articleFactory250Posts } from './_article-factory-250-2026-07-25';
import { articleFactory1000ExtensionPosts } from './_article-factory-1000-extension-2026-07-26';

export const articleFactory1000Posts = [
  ...articleFactory250Posts,
  ...articleFactory1000ExtensionPosts,
];
