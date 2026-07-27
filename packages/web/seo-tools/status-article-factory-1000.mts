import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface BriefFile {
  batch: number;
  briefs: Array<{ slug: string; campaignCluster: string }>;
}

interface ScorecardFile {
  articles: number;
  failed: number;
  rows: Array<{ slug: string; words: number; failures: string[] }>;
}

const BATCH_COUNT = 150;
const BATCH_SIZE = 5;
const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(WEB_ROOT, '../..');
const POSTS_DIR = path.resolve(WEB_ROOT, 'src/app/blog/posts');
const REPORT_DIR = path.resolve(REPO_ROOT, 'docs/seo/article-factory-1000-2026-07-26');
const BRIEFS_DIR = path.resolve(REPORT_DIR, 'briefs');
const SCORECARDS_DIR = path.resolve(REPORT_DIR, 'batch-scorecards');

const batches = Array.from({ length: BATCH_COUNT }, (_, index) => {
  const batch = index + 1;
  const suffix = String(batch).padStart(3, '0');
  const briefPath = path.resolve(BRIEFS_DIR, `batch-${suffix}.json`);
  const manifestPath = path.resolve(POSTS_DIR, `_article-factory-1000-batch-${suffix}.ts`);
  const scorecardPath = path.resolve(SCORECARDS_DIR, `batch-${suffix}.json`);
  const brief = fs.existsSync(briefPath)
    ? (JSON.parse(fs.readFileSync(briefPath, 'utf8')) as BriefFile)
    : null;
  const expectedSlugs = brief?.briefs.map(({ slug }) => slug) ?? [];
  const articleFiles = expectedSlugs.filter((slug) =>
    fs.existsSync(path.resolve(POSTS_DIR, `${slug}.ts`)),
  );
  const scorecard = fs.existsSync(scorecardPath)
    ? (JSON.parse(fs.readFileSync(scorecardPath, 'utf8')) as ScorecardFile)
    : null;
  const scorecardSlugs = new Set(scorecard?.rows.map(({ slug }) => slug) ?? []);
  const expectedSlugsMatch =
    expectedSlugs.length === BATCH_SIZE &&
    expectedSlugs.every((slug) => scorecardSlugs.has(slug)) &&
    scorecardSlugs.size === BATCH_SIZE;
  const passing =
    Boolean(scorecard) &&
    scorecard?.articles === BATCH_SIZE &&
    scorecard.failed === 0 &&
    scorecard.rows.every(
      ({ words, failures }) => words >= 3_000 && words <= 4_000 && failures.length === 0,
    ) &&
    expectedSlugsMatch;

  return {
    batch,
    cluster: brief?.briefs[0]?.campaignCluster ?? 'unknown',
    brief: Boolean(brief),
    articles: articleFiles.length,
    manifest: fs.existsSync(manifestPath),
    scorecard: Boolean(scorecard),
    passing,
    words: scorecard?.rows.reduce((total, row) => total + row.words, 0) ?? 0,
    failedArticles: scorecard?.failed ?? null,
  };
});

const clusters = [...new Set(batches.map(({ cluster }) => cluster))];
const result = {
  generatedAt: new Date().toISOString(),
  target: {
    batches: BATCH_COUNT,
    articles: BATCH_COUNT * BATCH_SIZE,
  },
  totals: {
    briefs: batches.filter(({ brief }) => brief).length,
    articleFiles: batches.reduce((total, batch) => total + batch.articles, 0),
    manifests: batches.filter(({ manifest }) => manifest).length,
    scorecards: batches.filter(({ scorecard }) => scorecard).length,
    passingBatches: batches.filter(({ passing }) => passing).length,
    passingArticles: batches.filter(({ passing }) => passing).length * BATCH_SIZE,
    auditedWords: batches.reduce((total, batch) => total + batch.words, 0),
  },
  clusters: Object.fromEntries(
    clusters.map((cluster) => {
      const clusterBatches = batches.filter((batch) => batch.cluster === cluster);
      return [
        cluster,
        {
          batches: clusterBatches.length,
          articleFiles: clusterBatches.reduce((total, batch) => total + batch.articles, 0),
          passingBatches: clusterBatches.filter(({ passing }) => passing).length,
        },
      ];
    }),
  ),
  incompleteBatches: batches.filter(({ passing }) => !passing),
};

fs.writeFileSync(path.resolve(REPORT_DIR, 'progress.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(
  JSON.stringify(
    process.argv.includes('--verbose')
      ? result
      : {
          generatedAt: result.generatedAt,
          target: result.target,
          totals: result.totals,
          clusters: result.clusters,
          nextIncompleteBatches: result.incompleteBatches.slice(0, 12).map(({ batch }) => batch),
        },
    null,
    2,
  ),
);
