import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import articleFactoryModule from '../src/app/blog/posts/_article-factory-1000-2026-07-26';
import extensionModule from '../src/app/blog/posts/_article-factory-1000-extension-2026-07-26';
import seoClusterQualityModule from '../src/app/blog/posts/seo-cluster-quality';

import type { BlogPost } from '../src/app/blog/posts';

interface AuditRow {
  slug: string;
  words: number;
  wcWords: number;
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

const { articleFactory1000Posts } = articleFactoryModule as {
  articleFactory1000Posts: Array<{ slug: string; post: BlogPost }>;
};
const { articleFactory1000ExtensionPosts } = extensionModule as {
  articleFactory1000ExtensionPosts: Array<{ slug: string; post: BlogPost }>;
};
const { findHighestShingleOverlap } = seoClusterQualityModule;

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(WEB_ROOT, '../..');
const REPORT_DIR = path.resolve(REPO_ROOT, 'docs/seo/article-factory-1000-2026-07-26');
const SCORECARD_PATH = path.resolve(REPORT_DIR, 'scorecards.json');
const BASELINE_PATH = path.resolve(
  REPO_ROOT,
  'docs/seo/article-factory-250-2026-07-25/inventory-baseline.json',
);

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

if (audit.articles !== 1_000 || audit.failed !== 0 || audit.rows.length !== 1_000) {
  throw new Error(
    `Refusing to report a failing run: ${audit.articles} articles, ${audit.failed} failures.`,
  );
}
if (articleFactory1000Posts.length !== 1_000) {
  throw new Error(`Expected 1,000 campaign articles, found ${articleFactory1000Posts.length}.`);
}
if (articleFactory1000ExtensionPosts.length !== 750) {
  throw new Error(
    `Expected 750 extension articles, found ${articleFactory1000ExtensionPosts.length}.`,
  );
}
if (new Set(articleFactory1000Posts.map(({ slug }) => slug)).size !== 1_000) {
  throw new Error('The combined campaign contains duplicate slugs.');
}

const scorecardsBySlug = new Map(audit.rows.map((row) => [row.slug, row]));
const campaignInventoryItems: InventoryItem[] = articleFactory1000Posts.map(({ slug, post }) => ({
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
    campaignArticles: campaignInventoryItems.length,
    checkpointArticles: 250,
    extensionArticles: 750,
    finalRecords: baseline.items.length + campaignInventoryItems.length,
    finalArticles:
      baseline.items.filter(({ kind }) => kind === 'article').length +
      campaignInventoryItems.length,
  },
  items: [...baseline.items, ...campaignInventoryItems],
};
fs.copyFileSync(BASELINE_PATH, path.resolve(REPORT_DIR, 'inventory-baseline.json'));
fs.writeFileSync(
  path.resolve(REPORT_DIR, 'inventory.json'),
  `${JSON.stringify(finalInventory, null, 2)}\n`,
);

const overlap = findHighestShingleOverlap(
  articleFactory1000Posts.map(({ slug, post }) => ({
    slug,
    clusterId: 'article-factory-1000-2026-07-26',
    post,
  })),
);
const values = audit.rows.map(({ words }) => words);
const totalWords = values.reduce((total, words) => total + words, 0);
const rejectedText = fs.readFileSync(path.resolve(REPORT_DIR, 'rejected.md'), 'utf8');
const rejectedRows = rejectedText
  .split('\n')
  .filter(
    (line) => line.startsWith('| ') && !line.includes('---') && !line.includes('Stage |'),
  ).length;
const articleRows = articleFactory1000Posts.map(({ slug, post }, index) => {
  const row = scorecardsBySlug.get(slug);
  if (!row || row.failures.length > 0) throw new Error(`Missing passing scorecard for ${slug}.`);
  const score = Math.min(row.eeat.overall, row.aiCitationReadiness);
  const filePath = `packages/web/src/app/blog/posts/${slug}.ts`;
  return `| ${index + 1} | \`${slug}\` | ${post.primaryKeyword} | ${row.words.toLocaleString(
    'en-US',
  )} | ${score}/100 | \`${filePath}\` |`;
});

const report = `# Article Factory 1,000 Final Report

Date: 2026-07-26

## Result

| Metric | Result |
|---|---:|
| Campaign articles shipped | 1,000 |
| Prior checkpoint | 250 |
| New extension | 750 |
| Audit failures | 0 |
| Total prose words | ${totalWords.toLocaleString('en-US')} |
| Minimum article words | ${Math.min(...values).toLocaleString('en-US')} |
| Maximum article words | ${Math.max(...values).toLocaleString('en-US')} |
| Average article words | ${Math.round(totalWords / values.length).toLocaleString('en-US')} |
| Highest eight-word containment | ${(overlap?.containment ?? 0).toFixed(5)} |
| Highest-overlap pair | ${overlap ? `\`${overlap.leftSlug}\` and \`${overlap.rightSlug}\`` : 'None'} |
| Baseline inventory records | ${baseline.items.length.toLocaleString('en-US')} |
| Final inventory records | ${(baseline.items.length + 1_000).toLocaleString('en-US')} |
| Collisions and weak topics rejected | ${rejectedRows.toLocaleString('en-US')} |

## Shipped Articles

| # | Slug | Primary keyword | Words | Audit | File |
|---:|---|---|---:|---:|---|
${articleRows.join('\n')}

## Rejected Topics

The full rejection log records schema failures, route failures, inventory collisions,
cross-candidate collisions, and capacity checks:
\`docs/seo/article-factory-1000-2026-07-26/rejected.md\`.

## Inventory

The final inventory contains ${(
  baseline.items.filter(({ kind }) => kind === 'article').length + 1_000
).toLocaleString('en-US')} articles and ${baseline.staticRouteCount.toLocaleString(
  'en-US',
)} static routes. The machine-readable inventory is stored in
\`docs/seo/article-factory-1000-2026-07-26/inventory.json\`.
`;

fs.writeFileSync(path.resolve(REPORT_DIR, 'final-report.md'), report);
console.log(
  JSON.stringify(
    {
      campaignArticles: 1_000,
      extensionArticles: 750,
      totalWords,
      minWords: Math.min(...values),
      maxWords: Math.max(...values),
      averageWords: Math.round(totalWords / values.length),
      highestShingleContainment: overlap?.containment ?? 0,
      highestShinglePair: overlap
        ? { leftSlug: overlap.leftSlug, rightSlug: overlap.rightSlug }
        : null,
      finalInventoryRecords: baseline.items.length + 1_000,
    },
    null,
    2,
  ),
);
