import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_DIR = path.resolve(WEB_ROOT, 'src/app/blog/posts');
const OUTPUT_PATH = path.resolve(POSTS_DIR, '_article-factory-250-2026-07-25.ts');
const BATCH_COUNT = 50;

const batches = Array.from({ length: BATCH_COUNT }, (_, index) => index + 1);
const missing = batches.filter((batch) => {
  const suffix = String(batch).padStart(2, '0');
  return !fs.existsSync(path.resolve(POSTS_DIR, `_article-factory-250-batch-${suffix}.ts`));
});

if (missing.length > 0) {
  throw new Error(`Cannot finalize article factory. Missing batches: ${missing.join(', ')}`);
}

const imports = batches
  .map((batch) => {
    const suffix = String(batch).padStart(2, '0');
    return `import { articleFactory250Batch${suffix}Posts } from './_article-factory-250-batch-${suffix}';`;
  })
  .join('\n');
const spreads = batches
  .map((batch) => `  ...articleFactory250Batch${String(batch).padStart(2, '0')}Posts,`)
  .join('\n');

const source = `${imports}

export const articleFactory250Posts = [
${spreads}
];
`;

fs.writeFileSync(OUTPUT_PATH, source);
console.log(
  `Generated ${path.relative(WEB_ROOT, OUTPUT_PATH)} from ${BATCH_COUNT} batch manifests.`,
);
