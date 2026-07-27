import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface SelectedCandidate {
  slug: string;
  authoritativeSources: string[];
}

interface VerificationRow {
  url: string;
  status: number | null;
  method: 'HEAD' | 'GET';
  reachable: boolean;
  referencedBy: string[];
  error: string | null;
}

const CONCURRENCY = 8;
const TIMEOUT_MS = 20_000;
const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(WEB_ROOT, '../..');
const REPORT_DIR = path.resolve(REPO_ROOT, 'docs/seo/article-factory-1000-2026-07-26');
const SELECTED_PATH = path.resolve(REPORT_DIR, 'selected-campaign.json');
const OUTPUT_PATH = path.resolve(REPORT_DIR, 'source-verification.json');

const selected = JSON.parse(fs.readFileSync(SELECTED_PATH, 'utf8')) as {
  selected: SelectedCandidate[];
};
const references = new Map<string, string[]>();
for (const candidate of selected.selected) {
  for (const source of candidate.authoritativeSources) {
    const slugs = references.get(source);
    if (slugs) slugs.push(candidate.slug);
    else references.set(source, [candidate.slug]);
  }
}

async function request(url: string, method: 'HEAD' | 'GET'): Promise<Response> {
  return fetch(url, {
    method,
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      'user-agent': 'QASkills-SEO-Source-Verification/1.0',
      accept: 'text/html,application/json,text/plain;q=0.9,*/*;q=0.8',
      ...(method === 'GET' ? { range: 'bytes=0-1023' } : {}),
    },
  });
}

function isReachableStatus(status: number): boolean {
  return (status >= 200 && status < 400) || status === 401 || status === 403 || status === 429;
}

async function verify(url: string): Promise<VerificationRow> {
  let headError: unknown;
  try {
    const response = await request(url, 'HEAD');
    if (isReachableStatus(response.status)) {
      return {
        url,
        status: response.status,
        method: 'HEAD',
        reachable: true,
        referencedBy: references.get(url) ?? [],
        error: null,
      };
    }
  } catch (error) {
    headError = error;
  }

  try {
    const response = await request(url, 'GET');
    await response.body?.cancel();
    const reachable = isReachableStatus(response.status);
    return {
      url,
      status: response.status,
      method: 'GET',
      reachable,
      referencedBy: references.get(url) ?? [],
      error: reachable ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    const getMessage = error instanceof Error ? error.message : String(error);
    const headMessage =
      headError === undefined
        ? null
        : headError instanceof Error
          ? headError.message
          : String(headError);
    return {
      url,
      status: null,
      method: 'GET',
      reachable: false,
      referencedBy: references.get(url) ?? [],
      error: headMessage ? `HEAD: ${headMessage}; GET: ${getMessage}` : getMessage,
    };
  }
}

const urls = [...references.keys()].sort();
const rows: VerificationRow[] = [];
let nextIndex = 0;
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, urls.length) }, async () => {
    while (nextIndex < urls.length) {
      const index = nextIndex;
      nextIndex += 1;
      rows[index] = await verify(urls[index]);
    }
  }),
);

const failures = rows.filter(({ reachable }) => !reachable);
const result = {
  generatedAt: new Date().toISOString(),
  selectedArticles: selected.selected.length,
  uniqueSources: rows.length,
  reachable: rows.length - failures.length,
  failed: failures.length,
  rows,
};
fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      selectedArticles: result.selectedArticles,
      uniqueSources: result.uniqueSources,
      reachable: result.reachable,
      failed: result.failed,
      failures,
      output: path.relative(REPO_ROOT, OUTPUT_PATH),
    },
    null,
    2,
  ),
);
if (failures.length > 0) process.exitCode = 1;
