import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface Brief {
  sourceTopicId: string;
  batch: number;
  batchPosition: number;
  campaignCluster: string;
  slug: string;
  primaryKeyword: string;
  title: string;
  description: string;
  intent: string;
  coreQuestion: string;
  intentBoundary: string;
  secondaryKeywords: string[];
  repoEvidence: string[];
  internalRoutes: string[];
  relatedSlugs: string[];
  sources: string[];
  codeExamples: Array<{
    title: string;
    language: string;
    path: string;
    focus: string;
  }>;
}

interface BriefFile {
  batch: number;
  briefs: Brief[];
}

const BATCH_COUNT = 150;
const BATCH_SIZE = 5;
const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(WEB_ROOT, '../..');
const POSTS_DIR = path.resolve(WEB_ROOT, 'src/app/blog/posts');
const REPORT_DIR = path.resolve(REPO_ROOT, 'docs/seo/article-factory-1000-2026-07-26');
const BRIEFS_DIR = path.resolve(REPORT_DIR, 'briefs');

function sanitizeAscii(value: string): string {
  return value
    .replace(/\u2014/g, '-')
    .normalize('NFKD')
    .replace(/[^\x00-\x7f]/g, '')
    .replace(/```/g, '')
    .trim();
}

function extractSnippet(
  filePath: string,
  exampleIndex: number,
): { language: string; snippet: string } {
  const absolutePath = path.resolve(REPO_ROOT, filePath);
  const source = fs.readFileSync(absolutePath, 'utf8');
  const extension = path.extname(filePath).toLowerCase();
  const fenced = source.match(/```([A-Za-z0-9_-]*)\n([\s\S]*?)```/);
  if (fenced?.[2]) {
    return {
      language: fenced[1] || 'text',
      snippet: sanitizeAscii(
        fenced[2]
          .split('\n')
          .slice(exampleIndex * 10, exampleIndex * 10 + 18)
          .join('\n'),
      ),
    };
  }

  const lines = source.split('\n');
  const startCandidates = [
    lines.findIndex((line) => /\bexport\b.*\b(function|const|class|interface|type)\b/.test(line)),
    lines.findIndex((line) => /\b(function|class|describe|test|it)\b/.test(line)),
    lines.findIndex((line) => line.trim() && !line.trim().startsWith('//')),
  ].filter((index) => index >= 0);
  const start = (startCandidates[0] ?? 0) + exampleIndex * 12;
  const snippet = lines
    .slice(start, start + 18)
    .join('\n')
    .replace(/\t/g, '  ');
  const language =
    extension === '.ts' || extension === '.tsx'
      ? 'typescript'
      : extension === '.js' || extension === '.mjs'
        ? 'javascript'
        : extension === '.json'
          ? 'json'
          : extension === '.yml' || extension === '.yaml'
            ? 'yaml'
            : 'text';
  return { language, snippet: sanitizeAscii(snippet) };
}

function variableName(slug: string): string {
  return slug.replace(/-([a-z0-9])/g, (_, character: string) => character.toUpperCase());
}

function articleSource(brief: Brief, articleNumber: number): string {
  const repoEvidence = brief.repoEvidence.map((evidence, index, evidenceItems) => {
    if (
      evidenceItems.indexOf(evidence) === index &&
      evidenceItems.lastIndexOf(evidence) === index
    ) {
      return evidence;
    }
    return `${evidence}#evidence-${index + 1}`;
  });
  const codeExamples = brief.codeExamples.slice(0, 2).map((example, index) => {
    const extracted = extractSnippet(example.path, index);
    return {
      title: sanitizeAscii(example.title),
      language: extracted.language || example.language,
      path: example.path,
      snippet: extracted.snippet,
    };
  });
  const config = {
    articleNumber,
    slug: brief.slug,
    campaignCluster: brief.campaignCluster,
    title: brief.title,
    description: brief.description,
    primaryKeyword: brief.primaryKeyword,
    intent: brief.intent,
    coreQuestion: brief.coreQuestion,
    intentBoundary: brief.intentBoundary,
    secondaryKeywords: brief.secondaryKeywords,
    repoEvidence,
    internalRoutes: brief.internalRoutes,
    relatedSlugs: brief.relatedSlugs,
    sources: brief.sources,
    codeExamples,
  };
  return `import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post(${JSON.stringify(config, null, 2)});
`;
}

function manifestSource(batch: number, briefs: Brief[]): string {
  const suffix = String(batch).padStart(3, '0');
  const imports = briefs
    .map((brief) => `import { post as ${variableName(brief.slug)} } from './${brief.slug}';`)
    .join('\n');
  const entries = briefs
    .map(
      (brief) => `  {
    slug: '${brief.slug}',
    post: ${variableName(brief.slug)},
  },`,
    )
    .join('\n');
  return `import type { BlogPost } from './index';

${imports}

export const articleFactory1000Batch${suffix}Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
${entries}
];
`;
}

const allBriefs: Brief[] = [];
for (let batch = 1; batch <= BATCH_COUNT; batch += 1) {
  const suffix = String(batch).padStart(3, '0');
  const briefPath = path.resolve(BRIEFS_DIR, `batch-${suffix}.json`);
  const briefFile = JSON.parse(fs.readFileSync(briefPath, 'utf8')) as BriefFile;
  if (briefFile.batch !== batch || briefFile.briefs.length !== BATCH_SIZE) {
    throw new Error(`${briefPath} does not contain the expected five briefs.`);
  }
  for (const brief of briefFile.briefs) {
    const articleNumber = 250 + allBriefs.length + 1;
    fs.writeFileSync(
      path.resolve(POSTS_DIR, `${brief.slug}.ts`),
      articleSource(brief, articleNumber),
    );
    allBriefs.push(brief);
  }
  fs.writeFileSync(
    path.resolve(POSTS_DIR, `_article-factory-1000-batch-${suffix}.ts`),
    manifestSource(batch, briefFile.briefs),
  );
}

if (new Set(allBriefs.map(({ slug }) => slug)).size !== 750) {
  throw new Error('The generated extension does not contain 750 unique slugs.');
}
console.log(`Generated ${allBriefs.length} articles and ${BATCH_COUNT} batch manifests.`);
