import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_DIR = path.resolve(WEB_ROOT, 'src/app/blog/posts');
const EXTENSION_OUTPUT_PATH = path.resolve(
  POSTS_DIR,
  '_article-factory-1000-extension-2026-07-26.ts',
);
const CAMPAIGN_OUTPUT_PATH = path.resolve(POSTS_DIR, '_article-factory-1000-2026-07-26.ts');
const BATCH_COUNT = 150;

const batches = Array.from({ length: BATCH_COUNT }, (_, index) => index + 1);
const missing = batches.filter((batch) => {
  const suffix = String(batch).padStart(3, '0');
  return !fs.existsSync(path.resolve(POSTS_DIR, `_article-factory-1000-batch-${suffix}.ts`));
});

if (missing.length > 0) {
  throw new Error(`Cannot finalize article factory. Missing batches: ${missing.join(', ')}`);
}

const imports = batches
  .map((batch) => {
    const suffix = String(batch).padStart(3, '0');
    return `import { articleFactory1000Batch${suffix}Posts } from './_article-factory-1000-batch-${suffix}';`;
  })
  .join('\n');
const spreads = batches
  .map((batch) => `  ...articleFactory1000Batch${String(batch).padStart(3, '0')}Posts,`)
  .join('\n');

const extensionSource = `${imports}

export const articleFactory1000ExtensionPosts = [
${spreads}
];
`;
const campaignSource = `import { articleFactory250Posts } from './_article-factory-250-2026-07-25';
import { articleFactory1000ExtensionPosts } from './_article-factory-1000-extension-2026-07-26';

export const articleFactory1000Posts = [
  ...articleFactory250Posts,
  ...articleFactory1000ExtensionPosts,
];
`;

fs.writeFileSync(EXTENSION_OUTPUT_PATH, extensionSource);
fs.writeFileSync(CAMPAIGN_OUTPUT_PATH, campaignSource);
console.log(
  `Generated ${path.relative(WEB_ROOT, EXTENSION_OUTPUT_PATH)} and ${path.relative(
    WEB_ROOT,
    CAMPAIGN_OUTPUT_PATH,
  )} from ${BATCH_COUNT} batch manifests.`,
);
