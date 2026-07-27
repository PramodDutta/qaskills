import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(WEB_ROOT, '../..');
const POSTS_DIR = path.resolve(WEB_ROOT, 'src/app/blog/posts');
const SELECTED_PATH = path.resolve(
  REPO_ROOT,
  'docs/seo/article-factory-1000-2026-07-26/selected.json',
);
const selected = JSON.parse(fs.readFileSync(SELECTED_PATH, 'utf8')) as {
  selected: Array<{ slug: string }>;
};

const files = new Set<string>([
  path.resolve(REPO_ROOT, 'package.json'),
  path.resolve(WEB_ROOT, 'package.json'),
  path.resolve(WEB_ROOT, 'e2e/article-factory-1000-2026-07-26.e2e.ts'),
  path.resolve(POSTS_DIR, 'article-factory-1000-builder.ts'),
  path.resolve(POSTS_DIR, 'article-factory-1000-publication.test.ts'),
  path.resolve(POSTS_DIR, 'article-factory-quality.ts'),
  path.resolve(POSTS_DIR, 'index.ts'),
  path.resolve(POSTS_DIR, 'seo-cluster-quality.ts'),
  path.resolve(WEB_ROOT, 'src/lib/extract-faqs.ts'),
  path.resolve(WEB_ROOT, 'src/lib/post-flow-config.test.ts'),
]);

for (const { slug } of selected.selected) {
  files.add(path.resolve(POSTS_DIR, `${slug}.ts`));
}
for (const entry of fs.readdirSync(POSTS_DIR)) {
  if (entry.startsWith('_article-factory-1000') && entry.endsWith('.ts')) {
    files.add(path.resolve(POSTS_DIR, entry));
  }
}
for (const entry of fs.readdirSync(path.resolve(WEB_ROOT, 'seo-tools'))) {
  if (entry.includes('article-factory-1000') && entry.endsWith('.mts')) {
    files.add(path.resolve(WEB_ROOT, 'seo-tools', entry));
  }
}

const prettier = path.resolve(REPO_ROOT, 'node_modules/.bin/prettier');
const paths = [...files].filter((filePath) => fs.existsSync(filePath));
for (let index = 0; index < paths.length; index += 100) {
  const result = spawnSync(prettier, ['--write', ...paths.slice(index, index + 100)], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Formatted ${paths.length} article-factory files.`);
