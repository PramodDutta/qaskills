import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const BATCH_COUNT = 150;
const BATCH_SIZE = 5;
const CONCURRENCY = Number.parseInt(process.env.ARTICLE_FACTORY_CONCURRENCY ?? '6', 10);
const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(WEB_ROOT, '../..');
const REPORT_DIR = path.resolve(REPO_ROOT, 'docs/seo/article-factory-1000-2026-07-26');
const SCORECARDS_DIR = path.resolve(REPORT_DIR, 'batch-scorecards');
const INVENTORY_PATH = path.resolve(
  REPO_ROOT,
  'docs/seo/article-factory-250-2026-07-25/inventory.json',
);
const SELECTED_PATH = path.resolve(REPORT_DIR, 'selected.json');

interface BatchFailure {
  batch: number;
  output: string;
}

function runBatch(batch: number): Promise<BatchFailure | null> {
  const suffix = String(batch).padStart(3, '0');
  const manifest = `src/app/blog/posts/_article-factory-1000-batch-${suffix}.ts`;
  const scorecard = path.resolve(SCORECARDS_DIR, `batch-${suffix}.json`);

  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', 'seo-tools/audit-article-batch.mts', manifest, String(BATCH_SIZE)],
      {
        cwd: WEB_ROOT,
        env: {
          ...process.env,
          ARTICLE_FACTORY_INVENTORY: INVENTORY_PATH,
          ARTICLE_FACTORY_SELECTED: SELECTED_PATH,
          ARTICLE_FACTORY_DATE: '2026-07-26',
          ARTICLE_FACTORY_SCORECARDS: scorecard,
          ARTICLE_FACTORY_QUIET: '1',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.on('close', (code) => {
      resolve(code === 0 ? null : { batch, output: output.trim() });
    });
  });
}

if (!Number.isInteger(CONCURRENCY) || CONCURRENCY < 1 || CONCURRENCY > 16) {
  throw new Error('ARTICLE_FACTORY_CONCURRENCY must be an integer from 1 to 16.');
}

fs.mkdirSync(SCORECARDS_DIR, { recursive: true });
const queue = Array.from({ length: BATCH_COUNT }, (_, index) => index + 1);
const failures: BatchFailure[] = [];

async function worker(): Promise<void> {
  while (queue.length > 0) {
    const batch = queue.shift();
    if (batch === undefined) return;
    const failure = await runBatch(batch);
    if (failure) failures.push(failure);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

if (failures.length > 0) {
  for (const failure of failures.sort((left, right) => left.batch - right.batch)) {
    console.error(`Batch ${String(failure.batch).padStart(3, '0')} failed:\n${failure.output}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Audited ${BATCH_COUNT} batches and ${BATCH_COUNT * BATCH_SIZE} articles.`);
}
