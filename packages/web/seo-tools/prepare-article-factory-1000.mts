import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Intent = 'informational' | 'how-to' | 'comparison' | 'troubleshooting' | 'commercial';

interface RawScores {
  relevance?: number;
  specificity?: number;
  intentFit?: number;
  coverage?: number;
  coverageAbility?: number;
  total?: number;
}

interface RawCandidate {
  id?: string;
  owner?: string;
  cluster?: string;
  group?: string;
  primaryKeyword?: string;
  proposedSlug?: string;
  slug?: string;
  titleTag?: string;
  title?: string;
  intent?: Intent;
  answerFirstQuestion?: string;
  exactQuestion?: string;
  scores?: RawScores;
  repoEvidence?: string[];
  secondaryKeywords?: string[];
  internalRoutes?: string[];
  authoritativeSources?: string[];
  officialSources?: string[];
  intentBoundary?: string;
  collisionAudit?: {
    status?: string;
    intentBoundary?: string;
    whyDistinct?: string;
    nearestExisting?: string;
  };
  domain?: string;
  sourceFile?: string;
  sourceIndex?: number;
  reason?: string;
  rejectionReason?: string;
  closestOwner?: string;
  collidingRoute?: string;
  collisionType?: string;
  gate?: string;
}

interface Candidate {
  id: string;
  cluster: string;
  primaryKeyword: string;
  slug: string;
  proposedSlug: string;
  title: string;
  titleTag: string;
  intent: Intent;
  exactQuestion: string;
  answerFirstQuestion: string;
  scores: {
    relevance: number;
    specificity: number;
    intentFit: number;
    coverageAbility: number;
    total: number;
  };
  repoEvidence: string[];
  secondaryKeywords: string[];
  internalRoutes: string[];
  authoritativeSources: string[];
  intentBoundary: string;
  domain: string;
  sourceFile: string;
  sourceIndex: number;
  campaignCluster: CampaignCluster;
  collisionAudit?: RawCandidate['collisionAudit'];
  batch?: number;
  batchPosition?: number;
}

interface RejectedCandidate {
  candidate: Partial<Candidate> & {
    primaryKeyword?: string;
    slug?: string;
    domain?: string;
  };
  reason: string;
  collision?: string;
  stage: 'mining' | 'schema' | 'inventory' | 'candidate' | 'capacity';
}

interface IntentAudit {
  reviews: Array<{
    slug: string;
    decision: 'pass' | 'reject';
    reason: string;
  }>;
  replacements: Array<{
    rejectedSlug: string;
    recommendedReserveSlug: string;
    whyDistinct: string;
  }>;
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

interface OutlineItem {
  heading: string;
  question: boolean;
  secondaryKeyword?: string;
  coverage: string;
  repoEvidence: string[];
}

interface Brief {
  sourceTopicId: string;
  batch: number;
  batchPosition: number;
  domain: string;
  campaignCluster: CampaignCluster;
  slug: string;
  primaryKeyword: string;
  title: string;
  description: string;
  intent: Intent;
  coreQuestion: string;
  intentBoundary: string;
  secondaryKeywords: string[];
  outline: OutlineItem[];
  tablePlan: {
    title: string;
    columns: string[];
    rows: Array<{
      scenario: string;
      controlledSetup: string;
      expectedObservation: string;
      failureSignal: string;
      evidenceSource: string;
    }>;
    sources: string[];
  };
  procedurePlan: {
    heading: string;
    steps: string[];
  };
  codeExamples: Array<{
    title: string;
    language: string;
    path: string;
    focus: string;
  }>;
  repoEvidence: string[];
  internalRoutes: string[];
  relatedSlugs: string[];
  sources: string[];
  faqQuestions: string[];
  cta: string;
}

const CAMPAIGN_CLUSTERS = [
  'cli-sdk-mcp',
  'web-platform',
  'browser-e2e',
  'ai-llm-rag',
  'system-quality',
  'frameworks-qa-practice',
] as const;
type CampaignCluster = (typeof CAMPAIGN_CLUSTERS)[number];

const DATE = '2026-07-26';
const ARTICLE_TARGET = 750;
const BATCH_SIZE = 5;
const CLUSTER_TARGET = ARTICLE_TARGET / CAMPAIGN_CLUSTERS.length;
const EXISTING_FACTORY_ARTICLES = 250;
const CAMPAIGN_SURVIVOR_TARGET = 1_500;
const TITLE_SUFFIX = ' | QASkills.sh';
const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(WEB_ROOT, '../..');
const PRIOR_DIR = path.resolve(REPO_ROOT, 'docs/seo/article-factory-250-2026-07-25');
const REPORT_DIR = path.resolve(REPO_ROOT, 'docs/seo/article-factory-1000-2026-07-26');
const MINING_DIR = path.resolve(REPORT_DIR, 'mining');
const BRIEFS_DIR = path.resolve(REPORT_DIR, 'briefs');
const INVENTORY_PATH = path.resolve(PRIOR_DIR, 'inventory.json');
const PRIOR_SELECTED_PATH = path.resolve(PRIOR_DIR, 'selected.json');
const PRE_AUDIT_SELECTED_PATH = path.resolve(REPORT_DIR, 'selected-pre-audit.json');
const MINING_FILES = [
  'cli-sdk-mcp.json',
  'web-platform.json',
  'browser-e2e.json',
  'ai-llm-rag.json',
  'system-quality.json',
  'frameworks-qa-practice.json',
] as const;
const BANNED_PHRASES = [
  'delve',
  "in today's fast-paced world",
  'game-changer',
  'unleash',
  'unlock the power',
  'moreover',
  'furthermore',
  "it's important to note",
  'in conclusion',
  'landscape',
  'elevate',
  'seamless',
  'robust',
];
const STOP_WORDS = new Set(
  'a an and are as at be by for from guide how in into is it of on or that the to vs with without your'.split(
    ' ',
  ),
);
const GENERIC_INTENT_WORDS = new Set(
  'qa quality test testing tests automation automated check checks verify verification validation guide tutorial workflow workflows practice practices'.split(
    ' ',
  ),
);
const VERIFIED_DYNAMIC_ROUTES = new Set(['/skills/Pramod/playwright-cli']);
const FALLBACK_ROUTES: Record<CampaignCluster, string[]> = {
  'cli-sdk-mcp': [
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
    '/blog/how-to-write-high-quality-qa-skills',
    '/blog/how-to-install-skills-claude-code',
  ],
  'web-platform': [
    '/blog/react-nextjs-testing-complete-guide',
    '/blog/api-testing-complete-guide',
    '/blog/database-testing-automation-guide',
    '/blog/authentication-authorization-testing-guide',
  ],
  'browser-e2e': [
    '/blog/playwright-e2e-complete-guide',
    '/blog/cypress-tutorial-beginners-2026',
    '/blog/selenium-tutorial-complete-beginners-2026',
    '/blog/end-to-end-testing-best-practices',
  ],
  'ai-llm-rag': [
    '/blog/testing-llm-applications-guide',
    '/blog/ai-agent-eval-testing-guide',
    '/blog/promptfoo-complete-guide-2026',
    '/blog/testing-ai-generated-code-sdet-playbook',
  ],
  'system-quality': [
    '/blog/api-testing-best-practices-guide',
    '/blog/performance-testing-complete-guide',
    '/blog/security-testing-complete-guide',
    '/blog/accessibility-testing-automation-guide',
  ],
  'frameworks-qa-practice': [
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
    '/blog/regression-testing-strategies-guide',
    '/blog/continuous-testing-devops-guide',
  ],
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value: string): string {
  return normalize(value).replace(/\s+/g, '-');
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => {
      if (
        /^(ai|api|ci|cli|css|dom|e2e|faq|html|http|https|llm|mcp|qa|rag|sdk|sql|ui|url)$/i.test(
          word,
        )
      ) {
        return word.toUpperCase();
      }
      if (/^(playwright|cypress|selenium|vitest|jest|pytest|appium|jmeter|k6)$/i.test(word)) {
        return `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`;
      }
      return `${word[0]?.toUpperCase() ?? ''}${word.slice(1).toLowerCase()}`;
    })
    .join(' ');
}

function titleTokens(value: string, removeGeneric = false): Set<string> {
  return new Set(
    normalize(value)
      .split(' ')
      .filter((token) => token && !STOP_WORDS.has(token))
      .filter((token) => !removeGeneric || !GENERIC_INTENT_WORDS.has(token)),
  );
}

function tokenOverlap(left: string, right: string, removeGeneric = false): number {
  const leftTokens = titleTokens(left, removeGeneric);
  const rightTokens = titleTokens(right, removeGeneric);
  const union = new Set([...leftTokens, ...rightTokens]);
  if (union.size === 0) return 0;
  return [...leftTokens].filter((token) => rightTokens.has(token)).length / union.size;
}

function extractEvidencePath(value: string): string {
  const match = value.match(/(?:packages|seed-skills|docs|\.github)\/[A-Za-z0-9_[\]./-]+/);
  return (match?.[0] ?? value.replace(/^`|`$/g, '').trim()).replace(/[.,:]$/, '');
}

function clampScore(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(10, value!)) : 0;
}

function campaignClusterFor(domain: string, sourceFile: string): CampaignCluster {
  const value = `${domain} ${sourceFile}`.toLowerCase();
  if (/ai|llm|rag|prompt|eval/.test(value)) return 'ai-llm-rag';
  if (/browser|playwright|cypress|selenium|e2e/.test(value)) return 'browser-e2e';
  if (/system-quality|performance|security|mobile|accessibility|api|data|ci/.test(value)) {
    return 'system-quality';
  }
  if (/web-platform|web-auth|email|search|cache/.test(value)) return 'web-platform';
  if (/framework|practice|skill-parser|validator|unit|component/.test(value)) {
    return 'frameworks-qa-practice';
  }
  return 'cli-sdk-mcp';
}

function normalizeCandidate(raw: RawCandidate, sourceFile: string, sourceIndex: number): Candidate {
  const primaryKeyword = raw.primaryKeyword?.trim() ?? '';
  const slug = (raw.slug ?? raw.proposedSlug ?? slugify(primaryKeyword)).trim();
  const domain = raw.domain?.trim() || sourceFile.replace(/\.json$/, '');
  const scores = raw.scores ?? {};
  const coverageAbility = clampScore(scores.coverageAbility ?? scores.coverage);
  const normalizedScores = {
    relevance: clampScore(scores.relevance),
    specificity: clampScore(scores.specificity),
    intentFit: clampScore(scores.intentFit),
    coverageAbility,
    total: 0,
  };
  normalizedScores.total =
    normalizedScores.relevance +
    normalizedScores.specificity +
    normalizedScores.intentFit +
    normalizedScores.coverageAbility;
  const title = raw.title?.trim() || raw.titleTag?.trim() || titleCase(primaryKeyword);
  const exactQuestion =
    raw.exactQuestion?.trim() ||
    raw.answerFirstQuestion?.trim() ||
    `How should a QA team implement ${primaryKeyword}?`;
  const intentBoundary =
    raw.intentBoundary?.trim() ||
    raw.collisionAudit?.intentBoundary?.trim() ||
    raw.collisionAudit?.whyDistinct?.trim() ||
    '';

  return {
    id: raw.id?.trim() || `${sourceFile.replace(/\.json$/, '')}-${sourceIndex + 1}`,
    cluster: raw.cluster?.trim() || raw.group?.trim() || raw.owner?.trim() || domain,
    primaryKeyword,
    slug,
    proposedSlug: slug,
    title,
    titleTag: title,
    intent: raw.intent ?? 'how-to',
    exactQuestion,
    answerFirstQuestion: exactQuestion,
    scores: normalizedScores,
    repoEvidence: [...new Set(raw.repoEvidence ?? [])],
    secondaryKeywords: [...new Set(raw.secondaryKeywords ?? [])],
    internalRoutes: [...new Set(raw.internalRoutes ?? [])],
    authoritativeSources: [...new Set(raw.authoritativeSources ?? raw.officialSources ?? [])],
    intentBoundary,
    domain,
    sourceFile,
    sourceIndex,
    campaignCluster: campaignClusterFor(domain, sourceFile),
    collisionAudit: raw.collisionAudit,
  };
}

function getSchemaFailure(candidate: Candidate, knownRoutes: Set<string>): string | null {
  const keywordWords = normalize(candidate.primaryKeyword).split(' ').filter(Boolean).length;
  if (!candidate.primaryKeyword) return 'missing primary keyword';
  if (keywordWords < 3 || keywordWords > 7) {
    return `primary keyword has ${keywordWords} words, expected 3 to 7`;
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidate.slug)) return 'invalid canonical slug';
  if (candidate.slug !== slugify(candidate.slug)) return 'slug is not canonical';
  if (`${candidate.primaryKeyword}${TITLE_SUFFIX}`.length > 60) {
    return 'primary keyword cannot lead a title within 60 emitted characters';
  }
  if (
    !['informational', 'how-to', 'comparison', 'troubleshooting', 'commercial'].includes(
      candidate.intent,
    )
  ) {
    return `unsupported intent ${candidate.intent}`;
  }
  if (candidate.scores.relevance < 8) return 'relevance score below 8';
  if (candidate.scores.specificity < 8) return 'specificity score below 8';
  if (candidate.scores.intentFit < 8) return 'intent-fit score below 8';
  if (candidate.scores.coverageAbility < 8) return 'coverage score below 8';
  if (candidate.repoEvidence.length < 2 || candidate.repoEvidence.length > 5) {
    return `repo evidence count ${candidate.repoEvidence.length}, expected 2 to 5`;
  }
  for (const evidence of candidate.repoEvidence) {
    const evidencePath = extractEvidencePath(evidence);
    if (!fs.existsSync(path.resolve(REPO_ROOT, evidencePath))) {
      return `missing repository evidence ${evidencePath}`;
    }
  }
  if (candidate.secondaryKeywords.length < 5 || candidate.secondaryKeywords.length > 8) {
    return `secondary keyword count ${candidate.secondaryKeywords.length}, expected 5 to 8`;
  }
  if (candidate.internalRoutes.length < 3 || candidate.internalRoutes.length > 5) {
    return `internal route count ${candidate.internalRoutes.length}, expected 3 to 5`;
  }
  for (const rawRoute of candidate.internalRoutes) {
    const route = rawRoute.replace(/\/$/, '') || '/';
    if (!knownRoutes.has(route) && !VERIFIED_DYNAMIC_ROUTES.has(route)) {
      return `unverified internal route ${route}`;
    }
  }
  if (candidate.authoritativeSources.length < 2 || candidate.authoritativeSources.length > 4) {
    return `authoritative source count ${candidate.authoritativeSources.length}, expected 2 to 4`;
  }
  for (const source of candidate.authoritativeSources) {
    try {
      if (new URL(source).protocol !== 'https:') return `source is not HTTPS ${source}`;
    } catch {
      return `invalid authoritative source ${source}`;
    }
  }
  if (!candidate.intentBoundary || candidate.intentBoundary.length < 20) {
    return 'intent boundary is missing or too short';
  }
  const policyText =
    `${candidate.primaryKeyword}\n${candidate.title}\n${candidate.exactQuestion}\n${candidate.intentBoundary}`.toLowerCase();
  if (policyText.includes('—')) return 'contains an em dash';
  for (const phrase of BANNED_PHRASES) {
    if (policyText.includes(phrase)) return `contains banned phrase ${phrase}`;
  }
  return null;
}

function getInventoryCollision(
  candidate: Candidate,
  articles: InventoryItem[],
): { reason: string; collision: string } | null {
  for (const item of articles) {
    if (
      candidate.slug === item.slug ||
      candidate.slug.includes(item.slug) ||
      item.slug.includes(candidate.slug)
    ) {
      return { reason: 'slug collision', collision: item.route };
    }
    if (tokenOverlap(candidate.primaryKeyword, item.title || item.h1) > 0.6) {
      return { reason: 'title token overlap above 60 percent', collision: item.route };
    }
    if (
      item.primaryKeyword &&
      normalize(candidate.primaryKeyword) === normalize(item.primaryKeyword)
    ) {
      return { reason: 'exact primary keyword collision', collision: item.route };
    }
    if (
      item.primaryKeyword &&
      tokenOverlap(candidate.primaryKeyword, item.primaryKeyword, true) >= 0.85
    ) {
      return { reason: 'primary intent token collision', collision: item.route };
    }
  }
  return null;
}

function getCandidateCollision(
  candidate: Candidate,
  approved: Candidate[],
): { reason: string; collision: string } | null {
  for (const other of approved) {
    if (
      candidate.slug === other.slug ||
      candidate.slug.includes(other.slug) ||
      other.slug.includes(candidate.slug)
    ) {
      return { reason: 'new-batch slug collision', collision: other.slug };
    }
    if (tokenOverlap(candidate.primaryKeyword, other.primaryKeyword) > 0.6) {
      return { reason: 'new-batch title token overlap above 60 percent', collision: other.slug };
    }
    if (normalize(candidate.primaryKeyword) === normalize(other.primaryKeyword)) {
      return { reason: 'new-batch exact primary keyword collision', collision: other.slug };
    }
    if (tokenOverlap(candidate.primaryKeyword, other.primaryKeyword, true) >= 0.85) {
      return { reason: 'new-batch primary intent token collision', collision: other.slug };
    }
    if (tokenOverlap(candidate.exactQuestion, other.exactQuestion, true) >= 0.9) {
      return { reason: 'new-batch answer intent collision', collision: other.slug };
    }
  }
  return null;
}

function candidateSort(left: Candidate, right: Candidate): number {
  const leftIsExtra = left.sourceFile.includes('-extra') ? 1 : 0;
  const rightIsExtra = right.sourceFile.includes('-extra') ? 1 : 0;
  return (
    leftIsExtra - rightIsExtra ||
    right.scores.total - left.scores.total ||
    right.scores.coverageAbility - left.scores.coverageAbility ||
    right.scores.specificity - left.scores.specificity ||
    left.slug.localeCompare(right.slug)
  );
}

function applyIntentAudits(
  preliminarySelected: Candidate[],
  approved: Candidate[],
  rejected: RejectedCandidate[],
): {
  selected: Candidate[];
  approvedAfterAudit: Candidate[];
  auditFilesApplied: number;
  intentRejections: number;
} {
  const auditDirectory = path.resolve(REPORT_DIR, 'intent-audits');
  const auditPaths = CAMPAIGN_CLUSTERS.map((cluster) =>
    path.resolve(auditDirectory, `${cluster}.json`),
  );
  const existingAuditPaths = auditPaths.filter((auditPath) => fs.existsSync(auditPath));
  if (existingAuditPaths.length === 0) {
    return {
      selected: preliminarySelected,
      approvedAfterAudit: approved,
      auditFilesApplied: 0,
      intentRejections: 0,
    };
  }
  if (existingAuditPaths.length !== auditPaths.length) {
    throw new Error(
      `Intent audit set is incomplete: found ${existingAuditPaths.length} of ${auditPaths.length}.`,
    );
  }

  const approvedBySlug = new Map(approved.map((candidate) => [candidate.slug, candidate]));
  const preliminarySlugs = new Set(preliminarySelected.map(({ slug }) => slug));
  const replacementByRejectedSlug = new Map<string, Candidate>();
  const intentRejectedSlugs = new Set<string>();
  const intentRejectionReasons = new Map<string, string>();

  for (let index = 0; index < CAMPAIGN_CLUSTERS.length; index += 1) {
    const cluster = CAMPAIGN_CLUSTERS[index];
    const audit = JSON.parse(fs.readFileSync(auditPaths[index], 'utf8')) as IntentAudit;
    const targets = preliminarySelected.filter(
      (candidate) => candidate.campaignCluster === cluster,
    );
    const targetSlugs = new Set(targets.map(({ slug }) => slug));
    if (!Array.isArray(audit.reviews) || audit.reviews.length !== CLUSTER_TARGET) {
      throw new Error(
        `${cluster} intent audit has ${audit.reviews?.length ?? 0} reviews, expected ${CLUSTER_TARGET}.`,
      );
    }
    if (new Set(audit.reviews.map(({ slug }) => slug)).size !== CLUSTER_TARGET) {
      throw new Error(`${cluster} intent audit contains duplicate review slugs.`);
    }
    for (const review of audit.reviews) {
      if (!targetSlugs.has(review.slug)) {
        throw new Error(`${cluster} intent audit reviewed an unselected slug: ${review.slug}.`);
      }
      if (review.decision === 'reject') {
        intentRejectedSlugs.add(review.slug);
        intentRejectionReasons.set(review.slug, review.reason);
      }
    }

    const clusterRejects = audit.reviews.filter(({ decision }) => decision === 'reject');
    if (!Array.isArray(audit.replacements) || audit.replacements.length !== clusterRejects.length) {
      throw new Error(
        `${cluster} intent audit has ${audit.replacements?.length ?? 0} replacements for ${clusterRejects.length} rejects.`,
      );
    }
    for (const replacement of audit.replacements) {
      if (!clusterRejects.some(({ slug }) => slug === replacement.rejectedSlug)) {
        throw new Error(
          `${cluster} replacement does not match a rejected slug: ${replacement.rejectedSlug}.`,
        );
      }
      const candidate = approvedBySlug.get(replacement.recommendedReserveSlug);
      if (!candidate) {
        throw new Error(
          `${cluster} replacement is not in the approved reserve pool: ${replacement.recommendedReserveSlug}.`,
        );
      }
      if (candidate.campaignCluster !== cluster) {
        throw new Error(
          `${replacement.recommendedReserveSlug} is ${candidate.campaignCluster}, expected ${cluster}.`,
        );
      }
      if (preliminarySlugs.has(candidate.slug)) {
        throw new Error(`${candidate.slug} is already selected and cannot be a replacement.`);
      }
      if (
        [...replacementByRejectedSlug.values()].some(
          ({ slug: replacementSlug }) => replacementSlug === candidate.slug,
        )
      ) {
        throw new Error(`${candidate.slug} is recommended more than once.`);
      }
      replacementByRejectedSlug.set(replacement.rejectedSlug, candidate);
    }
  }

  const selected = preliminarySelected.map(
    (candidate) => replacementByRejectedSlug.get(candidate.slug) ?? candidate,
  );
  if (new Set(selected.map(({ slug }) => slug)).size !== ARTICLE_TARGET) {
    throw new Error('Intent-audit replacements produced duplicate selected slugs.');
  }
  for (const rejectedSlug of intentRejectedSlugs) {
    const candidate = approvedBySlug.get(rejectedSlug);
    const replacement = replacementByRejectedSlug.get(rejectedSlug);
    rejected.push({
      candidate: candidate ?? { slug: rejectedSlug },
      reason: `independent intent audit: ${intentRejectionReasons.get(rejectedSlug) ?? 'rejected'}; replacement ${replacement?.slug ?? 'missing'}`,
      collision: replacement?.slug,
      stage: 'candidate',
    });
  }

  return {
    selected,
    approvedAfterAudit: approved.filter(({ slug }) => !intentRejectedSlugs.has(slug)),
    auditFilesApplied: auditPaths.length,
    intentRejections: intentRejectedSlugs.size,
  };
}

function getReviewedQueuePath(): string | null {
  const auditPaths = CAMPAIGN_CLUSTERS.map((cluster) =>
    path.resolve(REPORT_DIR, 'intent-audits', `${cluster}.json`),
  );
  if (!auditPaths.every((auditPath) => fs.existsSync(auditPath))) return null;

  const selectionPath = fs.existsSync(PRE_AUDIT_SELECTED_PATH)
    ? PRE_AUDIT_SELECTED_PATH
    : path.resolve(REPORT_DIR, 'selected.json');
  if (!fs.existsSync(selectionPath)) {
    throw new Error('Intent audits exist, but the reviewed preliminary selection is missing.');
  }
  return selectionPath;
}

function getReviewedApprovedPool(
  schemaPassed: Candidate[],
  recalculatedApproved: Candidate[],
): Candidate[] {
  const selectionPath = getReviewedQueuePath();
  if (!selectionPath) return recalculatedApproved;

  const persisted = JSON.parse(fs.readFileSync(selectionPath, 'utf8')) as {
    selected: Candidate[];
    reserves: Candidate[];
  };
  const basePool = [...persisted.selected, ...persisted.reserves];
  if (basePool.length === 0 || new Set(basePool.map(({ slug }) => slug)).size !== basePool.length) {
    throw new Error('Reviewed approved pool is empty or contains duplicate slugs.');
  }
  const pool = [...basePool];
  const poolSlugs = new Set(pool.map(({ slug }) => slug));
  const extraCandidates = schemaPassed
    .filter((candidate) => candidate.sourceFile.includes('-extra'))
    .sort(candidateSort);
  for (const candidate of extraCandidates) {
    if (poolSlugs.has(candidate.slug)) continue;
    if (getCandidateCollision(candidate, pool)) continue;
    pool.push(candidate);
    poolSlugs.add(candidate.slug);
  }
  return pool;
}

function getReviewedPreliminarySelection(calculatedSelection: Candidate[]): Candidate[] {
  const selectionPath = getReviewedQueuePath();
  if (!selectionPath) return calculatedSelection;

  const persisted = JSON.parse(fs.readFileSync(selectionPath, 'utf8')) as {
    selected: Candidate[];
  };
  if (persisted.selected.length !== ARTICLE_TARGET) {
    throw new Error(
      `Reviewed preliminary selection has ${persisted.selected.length} topics, expected ${ARTICLE_TARGET}.`,
    );
  }
  return persisted.selected;
}

function sentenceCase(value: string): string {
  if (!value) return value;
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

function makeDescription(keyword: string): string {
  const prefix = `${keyword}: `;
  const body =
    'test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified cleanup, and a CI gate your QA team can review and repeat.';
  const maximumBodyLength = 154 - prefix.length;
  let boundedBody = body;
  if (boundedBody.length > maximumBodyLength) {
    boundedBody = boundedBody.slice(0, maximumBodyLength);
    const lastSpace = boundedBody.lastIndexOf(' ');
    if (lastSpace >= maximumBodyLength - 12) boundedBody = boundedBody.slice(0, lastSpace);
  }
  let description = `${prefix}${boundedBody.replace(/[,:;]$/, '')}.`;
  if (description.length < 140) {
    const padding = ' Use practical steps and reviewable results.';
    const available = 154 - description.length;
    description = `${description.slice(0, -1)} ${padding
      .slice(0, available)
      .trim()
      .replace(/[,:;]$/, '')}.`;
  }
  if (description.length < 140 || description.length > 155) {
    throw new Error(`Cannot create compliant description for "${keyword}": ${description.length}`);
  }
  return description;
}

function ensureRelatedRoutes(candidate: Candidate, inventoryRoutes: Set<string>): string[] {
  const candidateRoutes = candidate.internalRoutes.filter((route) => route.startsWith('/blog/'));
  const routes = [...candidateRoutes, ...FALLBACK_ROUTES[candidate.campaignCluster]].filter(
    (route) => inventoryRoutes.has(route),
  );
  return [...new Set(routes)].slice(0, 4);
}

function buildBrief(candidate: Candidate, inventoryRoutes: Set<string>): Brief {
  const evidencePaths = candidate.repoEvidence.map(extractEvidencePath);
  const secondary = candidate.secondaryKeywords.slice(0, 6);
  const relatedRoutes = ensureRelatedRoutes(candidate, inventoryRoutes);
  if (relatedRoutes.length !== 4) {
    throw new Error(`${candidate.slug} has only ${relatedRoutes.length} verified related routes.`);
  }
  const internalRoutes = ['/skills', '/blog', ...candidate.internalRoutes, ...relatedRoutes]
    .map((route) => route.replace(/\/$/, '') || '/')
    .filter((route) => inventoryRoutes.has(route) || VERIFIED_DYNAMIC_ROUTES.has(route));
  const uniqueInternalRoutes = [...new Set(internalRoutes)];
  const evidenceFor = (index: number): string[] =>
    [
      evidencePaths[index % evidencePaths.length],
      evidencePaths[(index + 1) % evidencePaths.length],
    ].filter((value, itemIndex, array) => array.indexOf(value) === itemIndex);
  const sources = candidate.authoritativeSources.slice(0, 4);
  const scenarios = [
    'positive baseline',
    secondary[0],
    secondary[1],
    'boundary input',
    'cleanup and repeated run',
  ].filter(Boolean) as string[];
  const outline: OutlineItem[] = [
    {
      heading: `What does ${candidate.primaryKeyword} verify?`,
      question: true,
      coverage: `Answer "${candidate.exactQuestion}" in 40 to 60 words, then define the observable contract, scope, owner, inputs, outputs, and exclusions. Separate facts proved by the repository from the regression design recommended in this article.`,
      repoEvidence: evidenceFor(0),
    },
    {
      heading: `How do you build ${secondary[0]}?`,
      question: true,
      secondaryKeyword: secondary[0],
      coverage: `Create an isolated fixture for ${secondary[0]}. Name setup, controlled inputs, expected state, cleanup, and the first assertion that proves the positive path before any fault is injected.`,
      repoEvidence: evidenceFor(1),
    },
    {
      heading: `What breaks ${secondary[1]}?`,
      question: true,
      secondaryKeyword: secondary[1],
      coverage: `Explain likely product, harness, environment, protocol, and data failure modes for ${secondary[1]}. Tie each diagnosis to a concrete observation and reject success-only checks.`,
      repoEvidence: evidenceFor(2),
    },
    {
      heading: `${sentenceCase(secondary[2])} fixtures and controls`,
      question: false,
      secondaryKeyword: secondary[2],
      coverage: `Turn ${secondary[2]} into positive, negative, boundary, repeated-run, and cleanup controls. Preserve enough evidence to reproduce the first differing state without shared data or external timing assumptions.`,
      repoEvidence: evidenceFor(3),
    },
    {
      heading: `How should ${secondary[3]} be asserted?`,
      question: true,
      secondaryKeyword: secondary[3],
      coverage: `Build the oracle for ${secondary[3]} from exact values, allowed sets, state transitions, event order, or bounded timing as appropriate. Explain why each assertion distinguishes the intended contract from a false pass.`,
      repoEvidence: evidenceFor(4),
    },
    {
      heading: `${sentenceCase(secondary[4])} in CI`,
      question: false,
      secondaryKeyword: secondary[4],
      coverage: `Package ${secondary[4]} as a deterministic CI gate. Record fixture identity, runtime metadata, safe evidence, cleanup status, retry policy, and one concise diagnostic tied to repository evidence.`,
      repoEvidence: evidenceFor(5),
    },
    {
      heading: `${titleCase(candidate.primaryKeyword)} comparison matrix`,
      question: false,
      coverage: `Compare the positive baseline, negative case, boundary case, repeated run, and cleanup case. For each row, identify controlled setup, expected observation, failure signal, and the repository or official source that supports the check.`,
      repoEvidence: evidenceFor(0),
    },
    {
      heading: `How do you implement ${candidate.primaryKeyword}?`,
      question: true,
      coverage: `Follow the numbered procedure, include two repository-backed code examples, run the positive case before fault injection, and retain evidence that explains the first differing state.`,
      repoEvidence: evidencePaths,
    },
    {
      heading: 'Frequently Asked Questions',
      question: false,
      coverage: `Answer all six planned questions in 40 to 60 words each. Keep claims within the approved intent boundary, cite official sources, and state limitations when the evidence does not support a universal rule.`,
      repoEvidence: evidenceFor(1),
    },
    {
      heading: 'Conclusion',
      question: false,
      coverage: `Restate the verified contract, name the next regression action, and close with a route-backed CTA to the related article and the QASkills directory.`,
      repoEvidence: evidenceFor(0),
    },
  ];
  const relatedSlugs = relatedRoutes.map((route) => route.slice('/blog/'.length));

  return {
    sourceTopicId: candidate.id,
    batch: candidate.batch!,
    batchPosition: candidate.batchPosition!,
    domain: candidate.domain,
    campaignCluster: candidate.campaignCluster,
    slug: candidate.slug,
    primaryKeyword: candidate.primaryKeyword,
    title: titleCase(candidate.primaryKeyword),
    description: makeDescription(candidate.primaryKeyword),
    intent: candidate.intent,
    coreQuestion: candidate.exactQuestion,
    intentBoundary: candidate.intentBoundary,
    secondaryKeywords: secondary,
    outline,
    tablePlan: {
      title: `${titleCase(candidate.primaryKeyword)} scenario and evidence matrix`,
      columns: [
        'Scenario',
        'Controlled setup',
        'Expected observation',
        'Failure signal',
        'Evidence source',
      ],
      rows: scenarios.map((scenario, index) => ({
        scenario,
        controlledSetup:
          index === 0
            ? `Create the smallest isolated fixture supported by ${evidencePaths[0]}.`
            : `Change only the condition represented by "${scenario}" while retaining the baseline fixture.`,
        expectedObservation: `Capture the exact state, output, event order, and cleanup result required by ${candidate.primaryKeyword}.`,
        failureSignal:
          index === scenarios.length - 1
            ? 'The run passes without proving cleanup, isolation, or repeatability.'
            : `The observed result differs from the approved ${scenario} contract.`,
        evidenceSource: evidencePaths[index % evidencePaths.length],
      })),
      sources: [...evidencePaths, ...sources],
    },
    procedurePlan: {
      heading: `How to run ${candidate.primaryKeyword}`,
      steps: [
        `Read ${evidencePaths.join(' and ')} and record the supported workflow, inputs, outputs, and cleanup responsibilities.`,
        `Create an isolated positive baseline for ${candidate.primaryKeyword} with deterministic data and one named owner.`,
        `Run the baseline first and capture exact values, state transitions, event order, and safe diagnostic evidence.`,
        `Inject one failure at a time for ${secondary.slice(0, 3).join(', ')}, keeping every unrelated input fixed.`,
        'Compare the first differing state with the scenario matrix, classify the fault, and reject weak success-only evidence.',
        'Run the gate in CI, retain only safe artifacts, clean temporary state, and link the failure to its repository evidence.',
      ],
    },
    codeExamples: evidencePaths.slice(0, 2).map((evidencePath, index) => ({
      title:
        index === 0
          ? `Build the ${candidate.primaryKeyword} baseline`
          : 'Add negative cases and CI evidence',
      language: evidencePath.endsWith('.md') ? 'typescript' : 'typescript',
      path: evidencePath,
      focus:
        index === 0
          ? `Adapt the repository workflow into an isolated ${candidate.primaryKeyword} fixture.`
          : 'Add one fault at a time, exact assertions, safe evidence, and verified cleanup.',
    })),
    repoEvidence: evidencePaths,
    internalRoutes: uniqueInternalRoutes,
    relatedSlugs,
    sources,
    faqQuestions: [
      candidate.exactQuestion,
      `What should a ${secondary[0]} fixture record?`,
      `Which failure proves ${secondary[1]} is broken?`,
      `How do teams isolate ${secondary[2]}?`,
      `Which assertion is strongest for ${secondary[3]}?`,
      `How should CI report ${secondary[4]} failures?`,
    ],
    cta: `Read ${relatedRoutes[0]}, then open /skills and add the ${candidate.primaryKeyword} checks to the next QA run.`,
  };
}

function getMiningPaths(): string[] {
  const extraMiningDirectory = path.resolve(REPORT_DIR, 'mining-extra');
  const extraMiningFiles = fs.existsSync(extraMiningDirectory)
    ? fs
        .readdirSync(extraMiningDirectory)
        .filter((fileName) => fileName.endsWith('.json'))
        .sort()
        .map((fileName) => path.resolve(extraMiningDirectory, fileName))
    : [];
  return [
    ...MINING_FILES.map((miningFile) => path.resolve(MINING_DIR, miningFile)),
    ...extraMiningFiles,
  ];
}

function loadRawCandidates(): RawCandidate[] {
  const prior = JSON.parse(fs.readFileSync(PRIOR_SELECTED_PATH, 'utf8')) as {
    reserves: RawCandidate[];
  };
  const raws: RawCandidate[] = prior.reserves.map((candidate) => ({
    ...candidate,
    sourceFile: candidate.sourceFile ?? 'prior-reserves.json',
  }));
  for (const miningPath of getMiningPaths()) {
    const miningFile = path.basename(miningPath);
    if (!fs.existsSync(miningPath)) throw new Error(`Missing mining file: ${miningPath}`);
    const mining = JSON.parse(fs.readFileSync(miningPath, 'utf8')) as {
      survivors?: RawCandidate[];
      candidates?: RawCandidate[];
      rejected?: RawCandidate[];
      rejections?: RawCandidate[];
    };
    const survivors = mining.survivors ?? mining.candidates;
    if (!Array.isArray(survivors)) {
      throw new Error(`${miningFile} does not expose a survivors or candidates array.`);
    }
    raws.push(
      ...survivors.map((candidate) => ({
        ...candidate,
        domain: candidate.domain ?? miningFile.replace(/\.json$/, ''),
        sourceFile: miningFile,
      })),
    );
  }
  return raws;
}

function loadMiningRejections(): RejectedCandidate[] {
  const rows: RejectedCandidate[] = [];
  for (const miningPath of getMiningPaths()) {
    const miningFile = path.basename(miningPath);
    if (!fs.existsSync(miningPath)) continue;
    const mining = JSON.parse(fs.readFileSync(miningPath, 'utf8')) as {
      rejected?: RawCandidate[];
      rejections?: RawCandidate[];
    };
    const rejections = mining.rejected ?? mining.rejections ?? [];
    for (const rejection of rejections) {
      rows.push({
        candidate: {
          primaryKeyword: rejection.primaryKeyword,
          slug: rejection.slug ?? rejection.proposedSlug,
          domain: rejection.domain ?? miningFile.replace(/\.json$/, ''),
        },
        reason:
          rejection.reason ??
          rejection.rejectionReason ??
          rejection.gate ??
          rejection.collisionType ??
          'rejected during source mining',
        collision: rejection.closestOwner ?? rejection.collidingRoute,
        stage: 'mining',
      });
    }
  }
  return rows;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeDocumentation(
  inventory: { items: InventoryItem[]; counts?: Record<string, number> },
  rawCount: number,
  approved: Candidate[],
  selected: Candidate[],
  reserves: Candidate[],
  rejected: RejectedCandidate[],
  briefs: Brief[],
): void {
  fs.mkdirSync(BRIEFS_DIR, { recursive: true });
  const priorSelection = JSON.parse(fs.readFileSync(PRIOR_SELECTED_PATH, 'utf8')) as {
    selected: RawCandidate[];
  };
  const selectedReport = {
    generatedAt: new Date().toISOString(),
    date: DATE,
    objective: {
      campaignArticles: 1_000,
      existingFactoryArticles: EXISTING_FACTORY_ARTICLES,
      extensionArticles: ARTICLE_TARGET,
      batchSize: BATCH_SIZE,
      batches: ARTICLE_TARGET / BATCH_SIZE,
      minimumCampaignSurvivors: CAMPAIGN_SURVIVOR_TARGET,
    },
    counts: {
      rawCandidates: rawCount,
      approvedExtensionCandidates: approved.length,
      campaignApprovedSurvivors: EXISTING_FACTORY_ARTICLES + approved.length,
      selected: selected.length,
      reserves: reserves.length,
      rejected: rejected.length,
    },
    clusterCounts: Object.fromEntries(
      CAMPAIGN_CLUSTERS.map((cluster) => [
        cluster,
        {
          approved: approved.filter((candidate) => candidate.campaignCluster === cluster).length,
          selected: selected.filter((candidate) => candidate.campaignCluster === cluster).length,
          reserves: reserves.filter((candidate) => candidate.campaignCluster === cluster).length,
        },
      ]),
    ),
    selected,
    reserves,
  };
  writeJson(path.resolve(REPORT_DIR, 'selected.json'), selectedReport);
  writeJson(path.resolve(REPORT_DIR, 'selected-campaign.json'), {
    generatedAt: new Date().toISOString(),
    counts: {
      priorCheckpoint: priorSelection.selected.length,
      extension: selected.length,
      campaign: priorSelection.selected.length + selected.length,
    },
    selected: [...priorSelection.selected, ...selected],
  });

  for (let index = 0; index < briefs.length; index += BATCH_SIZE) {
    const batch = index / BATCH_SIZE + 1;
    writeJson(path.resolve(BRIEFS_DIR, `batch-${String(batch).padStart(3, '0')}.json`), {
      batch,
      briefs: briefs.slice(index, index + BATCH_SIZE),
    });
  }

  const briefRows = briefs.map(
    (brief, index) =>
      `| ${index + 251} | ${brief.batch} | ${brief.campaignCluster} | \`${brief.slug}\` | ${brief.primaryKeyword} | ${brief.intent} |`,
  );
  fs.writeFileSync(
    path.resolve(REPORT_DIR, 'briefs.md'),
    `# Article Factory 1,000 Topic Briefs

Date: ${DATE}

This extension adds 750 briefs to the 250 passing briefs from the prior checkpoint. Every
batch contains five topics and every selected topic passed schema, evidence, route, inventory,
and cross-candidate collision gates.

| Campaign # | Batch | Cluster | Slug | Primary keyword | Intent |
|---:|---:|---|---|---|---|
${briefRows.join('\n')}
`,
  );
  fs.writeFileSync(
    path.resolve(REPORT_DIR, 'brief-schema.md'),
    `# Brief Schema

Each file in \`briefs/batch-NNN.json\` contains exactly five briefs. A brief records the
approved primary keyword, search intent, answer-first question, 5 to 6 secondary terms,
10-section outline, comparison table, six-step procedure, two repository-backed examples,
verified internal routes, four related blog slugs, 2 to 4 official sources, six FAQ questions,
and a route-backed CTA.

Writers must follow the hard rules in the campaign master prompt. Brief data narrows the
intent; it does not authorize unsupported product behavior or invented results.
`,
  );
  const candidateRows = approved.map(
    (candidate, index) =>
      `| ${index + 1} | ${candidate.campaignCluster} | \`${candidate.slug}\` | ${candidate.primaryKeyword} | ${candidate.scores.total}/40 | ${selected.includes(candidate) ? 'selected' : 'reserve'} |`,
  );
  fs.writeFileSync(
    path.resolve(REPORT_DIR, 'candidates.md'),
    `# Approved Candidate Queue

| # | Cluster | Slug | Primary keyword | Score | Status |
|---:|---|---|---|---:|---|
${candidateRows.join('\n')}
`,
  );
  const rejectionRows = rejected.map(
    ({ candidate, reason, collision, stage }, index) =>
      `| ${index + 1} | ${stage} | ${candidate.domain ?? 'unknown'} | \`${candidate.slug ?? 'unknown'}\` | ${candidate.primaryKeyword ?? 'unknown'} | ${reason}${collision ? `: ${collision}` : ''} |`,
  );
  fs.writeFileSync(
    path.resolve(REPORT_DIR, 'rejected.md'),
    `# Rejected Topics

| # | Stage | Domain | Slug | Primary keyword | Reason |
|---:|---|---|---|---|---|
${rejectionRows.join('\n')}
`,
  );
  writeJson(path.resolve(REPORT_DIR, 'global-intent-audit.json'), {
    generatedAt: new Date().toISOString(),
    baselineInventory: INVENTORY_PATH,
    baselineRecords: inventory.items.length,
    rules: {
      slugContainment: true,
      titleTokenOverlapMaximum: 0.6,
      exactPrimaryKeyword: true,
      genericIntentTokenOverlapMaximum: 0.85,
      answerIntentTokenOverlapMaximum: 0.9,
      evidencePathsMustExist: true,
      internalRoutesMustExist: true,
      sourcesMustUseHttps: true,
    },
    counts: {
      rawCandidates: rawCount,
      approvedExtensionCandidates: approved.length,
      campaignApprovedSurvivors: EXISTING_FACTORY_ARTICLES + approved.length,
      selected: selected.length,
      rejected: rejected.length,
    },
    finalAssertion: {
      passed:
        selected.length === ARTICLE_TARGET &&
        EXISTING_FACTORY_ARTICLES + approved.length >= CAMPAIGN_SURVIVOR_TARGET,
      statement:
        'Every selected extension topic passed repository evidence, route, source, inventory, title, slug, keyword, and cross-candidate intent checks.',
    },
  });
  fs.writeFileSync(
    path.resolve(REPORT_DIR, 'discovery.md'),
    `# Discovery Report

Date: ${DATE}

| Item | Finding |
|---|---|
| Stack | pnpm 9 monorepo, Turborepo, TypeScript, Next.js 15 App Router, React 19 |
| Content directory | \`packages/web/src/app/blog/posts\` |
| Article format | TypeScript \`BlogPost\` modules with metadata, Markdown content, sources, and repository evidence |
| URL pattern | \`https://qaskills.sh/blog/<slug>\` |
| Registry | \`packages/web/src/app/blog/posts/index.ts\` |
| Sitemap | \`packages/web/src/app/sitemap.ts\`, generated from \`postList\` |
| Author | Pramod Dutta, The Testing Academy |
| Baseline inventory | ${inventory.items.length.toLocaleString('en-US')} routes and articles after the verified 250-article checkpoint |
| Extension | 750 posts in 150 five-article batches, producing 1,000 campaign articles total |

New modules are imported by a batch manifest, aggregated by the extension manifest, and
registered once in the blog index. The detail route emits BlogPosting, FAQPage, and
BreadcrumbList JSON-LD from the registered post.
`,
  );
}

if (!fs.existsSync(INVENTORY_PATH)) throw new Error(`Missing inventory: ${INVENTORY_PATH}`);
if (!fs.existsSync(PRIOR_SELECTED_PATH)) {
  throw new Error(`Missing prior topic selection: ${PRIOR_SELECTED_PATH}`);
}

const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8')) as {
  items: InventoryItem[];
  counts?: Record<string, number>;
};
const knownRoutes = new Set(inventory.items.map(({ route }) => route.replace(/\/$/, '') || '/'));
knownRoutes.add('/blog');
knownRoutes.add('/skills');
const inventoryArticles = inventory.items.filter(({ kind }) => kind === 'article');
const rawCandidates = loadRawCandidates();
const normalizedCandidates = rawCandidates.map((candidate, index) =>
  normalizeCandidate(
    candidate,
    candidate.sourceFile ?? candidate.domain ?? 'unknown.json',
    candidate.sourceIndex ?? index,
  ),
);
const rejected: RejectedCandidate[] = loadMiningRejections();
const schemaPassed: Candidate[] = [];

for (const candidate of normalizedCandidates) {
  const failure = getSchemaFailure(candidate, knownRoutes);
  if (failure) {
    rejected.push({ candidate, reason: failure, stage: 'schema' });
    continue;
  }
  const collision = getInventoryCollision(candidate, inventoryArticles);
  if (collision) {
    rejected.push({
      candidate,
      reason: collision.reason,
      collision: collision.collision,
      stage: 'inventory',
    });
    continue;
  }
  schemaPassed.push(candidate);
}

const approved: Candidate[] = [];
for (const candidate of schemaPassed.sort(candidateSort)) {
  const collision = getCandidateCollision(candidate, approved);
  if (collision) {
    rejected.push({
      candidate,
      reason: collision.reason,
      collision: collision.collision,
      stage: 'candidate',
    });
    continue;
  }
  approved.push(candidate);
}

const approvedPool = getReviewedApprovedPool(schemaPassed, approved);
const selectedByCluster = new Map<CampaignCluster, Candidate[]>();
for (const cluster of CAMPAIGN_CLUSTERS) {
  const candidates = approvedPool
    .filter(
      (candidate) =>
        candidate.campaignCluster === cluster && !candidate.sourceFile.includes('-extra'),
    )
    .sort(candidateSort);
  if (candidates.length < CLUSTER_TARGET) {
    rejected.push({
      candidate: { domain: cluster },
      reason: `cluster has ${candidates.length} approved candidates, expected at least ${CLUSTER_TARGET}`,
      stage: 'capacity',
    });
  }
  selectedByCluster.set(cluster, candidates.slice(0, CLUSTER_TARGET));
}

const calculatedSelection = CAMPAIGN_CLUSTERS.flatMap(
  (cluster) => selectedByCluster.get(cluster) ?? [],
);
const preliminarySelected = getReviewedPreliminarySelection(calculatedSelection);
const intentAuditResult = applyIntentAudits(preliminarySelected, approvedPool, rejected);
const selected = intentAuditResult.selected;
selected.forEach((candidate, index) => {
  candidate.batch = Math.floor(index / BATCH_SIZE) + 1;
  candidate.batchPosition = (index % BATCH_SIZE) + 1;
});
const selectedSlugs = new Set(selected.map(({ slug }) => slug));
const reserves = intentAuditResult.approvedAfterAudit
  .filter(({ slug }) => !selectedSlugs.has(slug))
  .sort(candidateSort);
const briefs = selected.map((candidate) => buildBrief(candidate, knownRoutes));

if (process.env.ARTICLE_FACTORY_DRY_RUN !== '1') {
  if (
    intentAuditResult.auditFilesApplied > 0 &&
    !fs.existsSync(PRE_AUDIT_SELECTED_PATH) &&
    fs.existsSync(path.resolve(REPORT_DIR, 'selected.json'))
  ) {
    fs.copyFileSync(path.resolve(REPORT_DIR, 'selected.json'), PRE_AUDIT_SELECTED_PATH);
  }
  writeDocumentation(
    inventory,
    rawCandidates.length,
    intentAuditResult.approvedAfterAudit,
    selected,
    reserves,
    rejected,
    briefs,
  );
}

const result = {
  rawCandidates: rawCandidates.length,
  schemaPassed: schemaPassed.length,
  approvedExtensionCandidates: intentAuditResult.approvedAfterAudit.length,
  campaignApprovedSurvivors:
    EXISTING_FACTORY_ARTICLES + intentAuditResult.approvedAfterAudit.length,
  selected: selected.length,
  reserves: reserves.length,
  rejected: rejected.length,
  intentAuditFilesApplied: intentAuditResult.auditFilesApplied,
  intentRejections: intentAuditResult.intentRejections,
  clusterCounts: Object.fromEntries(
    CAMPAIGN_CLUSTERS.map((cluster) => [
      cluster,
      {
        approved: intentAuditResult.approvedAfterAudit.filter(
          (candidate) => candidate.campaignCluster === cluster,
        ).length,
        selected: selected.filter((candidate) => candidate.campaignCluster === cluster).length,
      },
    ]),
  ),
};
console.log(JSON.stringify(result, null, 2));

if (selected.length !== ARTICLE_TARGET) {
  throw new Error(`Selected ${selected.length} topics, expected ${ARTICLE_TARGET}.`);
}
if (
  EXISTING_FACTORY_ARTICLES + intentAuditResult.approvedAfterAudit.length <
  CAMPAIGN_SURVIVOR_TARGET
) {
  throw new Error(
    `Campaign has ${
      EXISTING_FACTORY_ARTICLES + intentAuditResult.approvedAfterAudit.length
    } approved survivors, expected at least ${CAMPAIGN_SURVIVOR_TARGET}.`,
  );
}
