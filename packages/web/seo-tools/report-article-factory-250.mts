import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import articleFactoryModule from '../src/app/blog/posts/_article-factory-250-2026-07-25';
import seoClusterQualityModule from '../src/app/blog/posts/seo-cluster-quality';

import type { BlogPost } from '../src/app/blog/posts';

interface AuditRow {
  slug: string;
  words: number;
  keywordDensity: number;
  averageSentenceWords: number;
  fleschReadingEase: number;
  internalLinks: number;
  eeat: { overall: number };
  aiCitationReadiness: number;
  failures: string[];
}

interface InventoryItem {
  kind: string;
  route: string;
  slug: string;
  title: string;
  h1: string;
  description: string;
  primaryKeyword: string;
  keywords: string[];
}

const { articleFactory250Posts } = articleFactoryModule as {
  articleFactory250Posts: Array<{ slug: string; post: BlogPost }>;
};
const { findHighestShingleOverlap } = seoClusterQualityModule;

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(WEB_ROOT, '../..');
const REPORT_DIR = path.resolve(REPO_ROOT, 'docs/seo/article-factory-250-2026-07-25');
const SCORECARD_PATH = path.resolve(REPORT_DIR, 'scorecards.json');
const BASELINE_PATH =
  process.env.ARTICLE_FACTORY_INVENTORY ?? path.resolve(REPORT_DIR, 'inventory-baseline.json');

if (!fs.existsSync(SCORECARD_PATH)) {
  throw new Error(`Missing scorecards: ${SCORECARD_PATH}`);
}
if (!fs.existsSync(BASELINE_PATH)) {
  throw new Error(`Missing baseline inventory: ${BASELINE_PATH}`);
}

const audit = JSON.parse(fs.readFileSync(SCORECARD_PATH, 'utf8')) as {
  articles: number;
  failed: number;
  rows: AuditRow[];
};
const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as {
  generatedAt: string;
  items: InventoryItem[];
  registry: string;
  siteUrl: string;
  staticRouteCount: number;
};

if (audit.articles !== 250 || audit.failed !== 0 || audit.rows.length !== 250) {
  throw new Error(
    `Refusing to report a failing run: ${audit.articles} articles, ${audit.failed} failures.`,
  );
}
if (articleFactory250Posts.length !== 250) {
  throw new Error(`Expected 250 registered articles, found ${articleFactory250Posts.length}.`);
}

const scorecardsBySlug = new Map(audit.rows.map((row) => [row.slug, row]));
const newInventoryItems: InventoryItem[] = articleFactory250Posts.map(({ slug, post }) => ({
  kind: 'article',
  route: `/blog/${slug}`,
  slug,
  title: post.title,
  h1: post.title,
  description: post.description,
  primaryKeyword: post.primaryKeyword ?? '',
  keywords: post.keywords ?? [],
}));
const finalInventory = {
  generatedAt: new Date().toISOString(),
  baselineGeneratedAt: baseline.generatedAt,
  siteUrl: baseline.siteUrl,
  registry: baseline.registry,
  staticRouteCount: baseline.staticRouteCount,
  counts: {
    baselineRecords: baseline.items.length,
    baselineArticles: baseline.items.filter(({ kind }) => kind === 'article').length,
    newArticles: newInventoryItems.length,
    finalRecords: baseline.items.length + newInventoryItems.length,
    finalArticles:
      baseline.items.filter(({ kind }) => kind === 'article').length + newInventoryItems.length,
  },
  items: [...baseline.items, ...newInventoryItems],
};
fs.writeFileSync(
  path.resolve(REPORT_DIR, 'inventory.json'),
  `${JSON.stringify(finalInventory, null, 2)}\n`,
);

const overlap = findHighestShingleOverlap(
  articleFactory250Posts.map(({ slug, post }) => ({
    slug,
    clusterId: 'article-factory-250-2026-07-25',
    post,
  })),
);
const values = audit.rows.map(({ words }) => words);
const totalWords = values.reduce((total, words) => total + words, 0);
const rejectedText = fs.readFileSync(path.resolve(REPORT_DIR, 'rejected.md'), 'utf8');
const rejectedRows = rejectedText
  .split('\n')
  .filter(
    (line) => line.startsWith('| ') && !line.includes('---') && !line.includes('Domain |'),
  ).length;
const articleRows = articleFactory250Posts.map(({ slug, post }, index) => {
  const row = scorecardsBySlug.get(slug);
  if (!row || row.failures.length > 0) throw new Error(`Missing passing scorecard for ${slug}.`);
  const score = Math.min(row.eeat.overall, row.aiCitationReadiness);
  const filePath = `packages/web/src/app/blog/posts/${slug}.ts`;
  return `| ${index + 1} | \`${slug}\` | ${post.primaryKeyword} | ${row.words.toLocaleString('en-US')} | ${score}/100 | \`${filePath}\` |`;
});

const report = `# Article Factory Final Report

Date: 2026-07-25

## Result

| Metric | Result |
|---|---:|
| Articles shipped | 250 |
| Audit failures | 0 |
| Total prose words | ${totalWords.toLocaleString('en-US')} |
| Minimum article words | ${Math.min(...values).toLocaleString('en-US')} |
| Maximum article words | ${Math.max(...values).toLocaleString('en-US')} |
| Average article words | ${Math.round(totalWords / values.length).toLocaleString('en-US')} |
| Highest eight-word containment | ${(overlap?.containment ?? 0).toFixed(5)} |
| Baseline inventory records | ${baseline.items.length.toLocaleString('en-US')} |
| Final inventory records | ${(baseline.items.length + 250).toLocaleString('en-US')} |
| Collisions caught before writing | ${rejectedRows.toLocaleString('en-US')} |

## Shipped Articles

| # | Slug | Primary keyword | Words | Audit | File |
|---:|---|---|---:|---:|---|
${articleRows.join('\n')}

## Rejected Topics

The full rejection log records every rejected topic, collision, safety concern, and replacement:
\`docs/seo/article-factory-250-2026-07-25/rejected.md\`.

## Inventory

The final content inventory contains ${(
  baseline.items.filter(({ kind }) => kind === 'article').length + 250
).toLocaleString('en-US')} articles and ${baseline.staticRouteCount.toLocaleString(
  'en-US',
)} static routes. The machine-readable inventory is stored in
\`docs/seo/article-factory-250-2026-07-25/inventory.json\`.
`;

fs.writeFileSync(path.resolve(REPORT_DIR, 'final-report.md'), report);
console.log(
  JSON.stringify(
    {
      articles: 250,
      totalWords,
      minWords: Math.min(...values),
      maxWords: Math.max(...values),
      averageWords: Math.round(totalWords / values.length),
      highestShingleContainment: overlap?.containment ?? 0,
      finalInventoryRecords: baseline.items.length + 250,
    },
    null,
    2,
  ),
);
