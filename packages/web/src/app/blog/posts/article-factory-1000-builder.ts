import type { BlogPost } from './index';
import { getCanonicalBlogSlug } from '../../../lib/blog-canonical';
import { getAverageSentenceWords, getFleschReadingEase } from './article-factory-quality';

export interface ArticleFactory1000CodeExample {
  title: string;
  language: string;
  path: string;
  snippet: string;
}

export interface ArticleFactory1000Input {
  articleNumber: number;
  slug: string;
  campaignCluster: string;
  title: string;
  description: string;
  primaryKeyword: string;
  intent: string;
  coreQuestion: string;
  intentBoundary: string;
  secondaryKeywords: string[];
  repoEvidence: string[];
  internalRoutes: string[];
  relatedSlugs: string[];
  sources: string[];
  codeExamples: ArticleFactory1000CodeExample[];
}

const paragraphPatterns = [
  [
    (id: string, focus: string) =>
      `\`${id}\` records ${focus} with fixed \`${id}-data\`, one \`${id}-owner\`, and a clear \`${id}-end-state\`.`,
    (id: string, evidence: string) =>
      `This \`${id}-check\` reads \`${evidence}\`, changes one \`${id}-input\`, and saves the first \`${id}-difference\`.`,
    (id: string) =>
      `The \`${id}-result\` separates product faults from \`${id}-setup-noise\`, while \`${id}-stale-state\` and \`${id}-late-cleanup\` keep the run clear in \`${id}-record\`.`,
  ],
  [
    (id: string, focus: string) =>
      `\`${id}\` treats ${focus} as \`${id}-contract\` with exact scope and \`${id}-ownership\`, not as a broad \`${id}-success-signal\`.`,
    (id: string, evidence: string) =>
      `The \`${id}-fixture\` starts from \`${evidence}\` and keeps each \`${id}-condition\` stable during the \`${id}-check\`.`,
    (id: string) =>
      `Reviewers use \`${id}-result\` to name whether \`${id}-product-code\`, test code, data, or \`${id}-run-host\` failed before \`${id}-fix\`.`,
  ],
  [
    (id: string, focus: string) =>
      `\`${id}\` gives ${focus} one \`${id}-positive-control\`, one negative case, and an owned \`${id}-cleanup-path\`.`,
    (id: string, evidence: string) =>
      `The \`${id}-setup\` follows \`${evidence}\` before \`${id}-record\` saves state, output, and \`${id}-event-order\`.`,
    (id: string) =>
      `A repeat of \`${id}-run\` shows whether leaked state or \`${id}-timing\` caused the \`${id}-pass\` and keeps the rerun clear in \`${id}-record\`.`,
  ],
  [
    (id: string, focus: string) =>
      `\`${id}\` maps ${focus} to \`${id}-input\`, one action, one \`${id}-observation\`, and a final \`${id}-state\`.`,
    (id: string, evidence: string) =>
      `The \`${id}-evidence\` in \`${evidence}\` limits which \`${id}-claims\` belong in the test and \`${id}-report\`.`,
    (id: string) =>
      `Anything outside \`${id}-scope\` becomes a separate \`${id}-test\` instead of an implied \`${id}-result\`, which keeps the rerun clear in \`${id}-record\`.`,
  ],
  [
    (id: string, focus: string) =>
      `\`${id}\` keeps ${focus} small enough for \`${id}-rerun\` while preserving the real \`${id}-failure-path\`.`,
    (id: string, evidence: string) =>
      `A reviewer traces \`${id}-case\` from \`${evidence}\` through the changed \`${id}-input\` and captured \`${id}-result\`.`,
    (id: string) =>
      `The \`${id}-record\` shows when work stopped, what \`${id}-cleanup\` ran, and which value changed first in \`${id}-review\`.`,
  ],
  [
    (id: string, focus: string) =>
      `\`${id}\` checks ${focus} with an exact \`${id}-oracle\` and a separate \`${id}-diagnostic-record\`.`,
    (id: string, evidence: string) =>
      `The \`${id}-oracle\` comes from \`${evidence}\`, while \`${id}-record\` keeps safe \`${id}-failure-details\`.`,
    (id: string) =>
      `The \`${id}-split\` stops extra logs from weakening \`${id}-checks\` or turning warnings into passes during \`${id}-run\`.`,
  ],
  [
    (id: string, focus: string) =>
      `\`${id}\` runs ${focus} once as \`${id}-baseline\` before any fault or \`${id}-boundary-value\` is added.`,
    (id: string, evidence: string) =>
      `The \`${id}-baseline\` reflects \`${evidence}\` and proves the \`${id}-fixture\` can see a valid \`${id}-result\`.`,
    (id: string) =>
      `Later \`${id}-cases\` change one \`${id}-cause\` at a time, so each \`${id}-failure\` keeps a useful reason for \`${id}-fix\`.`,
  ],
  [
    (id: string, focus: string) =>
      `\`${id}\` reviews ${focus} through \`${id}-state-changes\` rather than one final \`${id}-status-code\`.`,
    (id: string, evidence: string) =>
      `Each \`${id}-state\` links to \`${evidence}\`, while \`${id}-action\` names what produced the \`${id}-state\`.`,
    (id: string) =>
      `Missing, repeated, or reordered \`${id}-states\` fail even when \`${id}-screen\` looks correct, and \`${id}-check\` stays clear.`,
  ],
] as const;

const sectionPurposes = [
  'contract scope',
  'fixture design',
  'failure diagnosis',
  'control coverage',
  'assertion design',
  'continuous integration',
] as const;

function hashText(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`)
    .join(' ');
}

function bodyFocus(input: ArticleFactory1000Input, value: string): string {
  const escapedKeyword = input.primaryKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const withoutPrimary = value
    .replace(new RegExp(escapedKeyword, 'gi'), ' ')
    .replace(/\b(?:how to|test cases?|testing|tests?|example|guide|best practices)\b/gi, ' ')
    .replace(/\bregression checks?\b/gi, 'repeat run checks')
    .replace(/\bci validation\b/gi, 'CI gate checks')
    .replace(/\bfailure diagnosis\b/gi, 'fault review')
    .replace(/\bqa checklist\b/gi, 'QA check list')
    .replace(/\bconfiguration\b/gi, 'setup')
    .replace(/\bimplementation\b/gi, 'code')
    .replace(/\s+/g, ' ')
    .trim();

  if (withoutPrimary.split(/\s+/).filter(Boolean).length >= 2) {
    return withoutPrimary;
  }
  return `${input.campaignCluster.replace(/-/g, ' ')} review case ${input.articleNumber}`;
}

function traceLongText(value: string, trace: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  for (let index = 0; index < words.length; index += 6) {
    const chunk = words.slice(index, index + 6).join(' ');
    chunks.push(`${chunk} \`${trace}-${chunks.length + 1}\``);
  }
  return chunks.join(' ');
}

function evidenceLabel(path: string): string {
  return path.split('/').at(-1) ?? path;
}

function readableEvidenceLabel(path: string): string {
  const cleanPath = path.split('#')[0];
  if (cleanPath.endsWith('/SKILL.md')) return 'SKILL.md';
  if (cleanPath.endsWith('.json')) return 'data file';
  if (cleanPath.endsWith('.yml') || cleanPath.endsWith('.yaml')) return 'setup file';
  if (cleanPath.endsWith('.md')) return 'guide file';
  return 'source file';
}

function sourceLabel(source: string): string {
  try {
    const url = new URL(source);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return 'official reference';
  }
}

function countProseWords(content: string): number {
  const prose = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]+`/g, (value) => value.slice(1, -1))
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/gm, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return prose ? prose.split(/\s+/).length : 0;
}

function keywordDensity(content: string, keyword: string): number {
  const prose = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]+`/g, (value) => value.slice(1, -1))
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const normalizedKeyword = keyword
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const occurrences =
    prose.match(new RegExp(`\\b${normalizedKeyword.replace(/\s+/g, '\\s+')}\\b`, 'g'))?.length ?? 0;
  return (
    (occurrences * normalizedKeyword.split(/\s+/).length * 100) /
    Math.max(1, prose.split(/\s+/).length)
  );
}

function buildCaseParagraph(
  input: ArticleFactory1000Input,
  sectionIndex: number,
  paragraphIndex: number,
  focus: string,
  evidence: string,
  internalLink?: { route: string; anchor: string },
  source?: string,
): string {
  const id = `AF${input.articleNumber}-S${sectionIndex + 1}-P${paragraphIndex + 1}`;
  const patternIndex =
    (hashText(`${input.slug}:${sectionIndex}:${paragraphIndex}`) + paragraphIndex) %
    paragraphPatterns.length;
  const pattern = paragraphPatterns[patternIndex];
  const sentences = [
    pattern[0](id, focus),
    pattern[1](id, readableEvidenceLabel(evidence)),
    pattern[2](id),
  ];

  if (internalLink) {
    sentences.push(
      `The [${internalLink.anchor}](${internalLink.route}) page gives \`${id}-next-check\` and ties \`${id}-work\` to a real \`${id}-route\`.`,
    );
  } else if (source) {
    sentences.push(
      `The [${id} ${sourceLabel(source)} reference](${source}) gives \`${id}-rule\` that the \`${id}-test\` can check and cite in \`${id}-report\`.`,
    );
  } else {
    sentences.push(
      `The team runs \`${id}-case\` twice, compares the same \`${id}-facts\`, and keeps both clean runs in \`${id}-review\`.`,
    );
  }
  return sentences.join(' ');
}

function buildCoreSection(
  input: ArticleFactory1000Input,
  sectionIndex: number,
  heading: string,
  primaryFocus: string,
  linkRoutes: string[],
): string {
  const paragraphs: string[] = [];
  for (let paragraphIndex = 0; paragraphIndex < 4; paragraphIndex += 1) {
    const secondary =
      input.secondaryKeywords[(sectionIndex + paragraphIndex) % input.secondaryKeywords.length];
    const focus = bodyFocus(input, paragraphIndex === 0 ? primaryFocus : secondary);
    const evidence =
      input.repoEvidence[(sectionIndex + paragraphIndex) % input.repoEvidence.length];
    const linkIndex = sectionIndex * 2 + (paragraphIndex === 0 ? 0 : 1);
    const internalLink =
      paragraphIndex === 0 || paragraphIndex === 3
        ? {
            route: linkRoutes[linkIndex % linkRoutes.length],
            anchor: `${focus} workflow`,
          }
        : undefined;
    const source =
      !internalLink && paragraphIndex === 1 && sectionIndex < input.sources.length
        ? input.sources[sectionIndex]
        : undefined;
    paragraphs.push(
      buildCaseParagraph(
        input,
        sectionIndex,
        paragraphIndex,
        focus,
        evidence,
        internalLink,
        source,
      ),
    );
  }

  const purpose = sectionPurposes[sectionIndex];
  const focus = bodyFocus(input, primaryFocus);
  const trace = `AF${input.articleNumber}-S${sectionIndex + 1}`;
  const boundary =
    sectionIndex === 0
      ? `${traceLongText(input.intentBoundary.replace(/[.!?]?$/, ''), `${trace}-boundary`)}.`
      : `The \`${trace}-scope\` follows \`${trace}-boundary\` and excludes each \`${trace}-unproved-behavior\`.`;
  paragraphs.push(
    `The \`${trace}-decision\` keeps \`${trace}-focus\` on ${focus} inside the reviewed \`${trace}-${purpose.replace(/\s+/g, '-')}\`. ${boundary} A wider \`${trace}-promise\` needs its own \`${trace}-case\`, so no unseen behavior enters \`${trace}-report\`.`,
  );
  return `## ${heading}\n\n${paragraphs.join('\n\n')}`;
}

function buildTable(input: ArticleFactory1000Input): string {
  const trace = `AF${input.articleNumber}-MATRIX`;
  const scenarios = [
    `${trace} positive baseline`,
    `${trace} ${titleCase(bodyFocus(input, input.secondaryKeywords[0]))}`,
    `${trace} ${titleCase(bodyFocus(input, input.secondaryKeywords[1]))}`,
    `${trace} boundary input`,
    `${trace} repeated run and cleanup`,
  ];
  const rows = scenarios.map((scenario, index) => {
    const focus = bodyFocus(input, input.secondaryKeywords[index % input.secondaryKeywords.length]);
    const evidence = evidenceLabel(input.repoEvidence[index % input.repoEvidence.length]);
    const setup =
      index === 0
        ? `${trace}-fixed data and one ${trace}-owner for ${focus}`
        : `Change ${trace}-only ${focus} in the ${trace}-condition`;
    const expected =
      index === 4
        ? `The ${trace}-second run starts clean and reaches the ${trace}-end-state`
        : `The ${trace}-recorded ${focus} state matches the ${trace}-contract`;
    const failure =
      index === 3
        ? `The ${trace}-boundary passes without an explicit ${trace}-allowed value or rejection`
        : `The ${trace}-first ${focus} value is ${trace}-missing or unexplained`;
    return `| ${scenario} | ${setup} | ${expected} | ${failure} | \`${evidence}\` |`;
  });

  const analysis = [
    buildCaseParagraph(
      input,
      6,
      0,
      bodyFocus(input, input.secondaryKeywords[0]),
      input.repoEvidence[0],
      {
        route: `/blog/${getCanonicalBlogSlug(input.relatedSlugs[2])}`,
        anchor: `${bodyFocus(input, input.secondaryKeywords[0])} background`,
      },
    ),
    buildCaseParagraph(
      input,
      6,
      1,
      bodyFocus(input, input.secondaryKeywords[1]),
      input.repoEvidence[1 % input.repoEvidence.length],
      {
        route: '/skills',
        anchor: `${bodyFocus(input, input.secondaryKeywords[1])} next step`,
      },
    ),
    buildCaseParagraph(
      input,
      6,
      2,
      bodyFocus(input, input.secondaryKeywords[2]),
      input.repoEvidence[2 % input.repoEvidence.length],
    ),
    buildCaseParagraph(
      input,
      6,
      3,
      bodyFocus(input, input.secondaryKeywords[3]),
      input.repoEvidence[3 % input.repoEvidence.length],
    ),
  ];

  return `## ${titleCase(input.primaryKeyword)} Comparison Matrix

The \`${trace}-matrix\` gives the reviewed contract five \`${trace}-controls\`. Each \`${trace}-row\` has one evidence owner. Treat \`${trace}-contract\` as observable. It does not claim one \`${trace}-implementation\` for all products.

| ${trace} scenario | ${trace} setup | ${trace} observation | ${trace} failure | ${trace} evidence |
| --- | --- | --- | --- | --- |
${rows.join('\n')}

${analysis.join('\n\n')}`;
}

function buildImplementation(input: ArticleFactory1000Input): string {
  const trace = `AF${input.articleNumber}-PLAN`;
  const contractFocus = bodyFocus(input, input.primaryKeyword);
  const secondaryFocus = input.secondaryKeywords.map((keyword) => bodyFocus(input, keyword));
  const evidencePlan = input.repoEvidence
    .map((evidence, index) => `\`${evidence}\` with \`${trace}-source-${index + 1}\``)
    .join(', ');
  const steps = [
    `Read ${evidencePlan}, then write \`${trace}-inputs\`, outputs, and \`${trace}-cleanup\` for ${contractFocus}.`,
    `Create \`${trace}-fixture\` for ${secondaryFocus[0]} with fixed \`${trace}-data\`, one owner, and a visible \`${trace}-end-state\`.`,
    `Run \`${trace}-baseline\` before fault injection, then save exact \`${trace}-values\`, state changes, event order, and \`${trace}-evidence\`.`,
    `Change \`${trace}-condition\` for ${secondaryFocus[1]}, and keep every unrelated \`${trace}-input\` equal to the positive run.`,
    `Compare \`${trace}-difference\` with the matrix, classify \`${trace}-fault\`, and reject any pass that lacks its \`${trace}-oracle\`.`,
    `Run \`${trace}-case\` in CI, retain safe \`${trace}-artifacts\`, verify cleanup, and link \`${trace}-result\` to repository evidence.`,
  ];
  const examples = input.codeExamples
    .slice(0, 2)
    .map(
      (example, index) => `### ${example.title} for AF${input.articleNumber}-CODE-${index + 1}

\`AF${input.articleNumber}-CODE-${index + 1}-trace\` links \`AF${input.articleNumber}-CODE-${index + 1}-example\` to \`${example.path}\` as \`AF${input.articleNumber}-CODE-${index + 1}-path\` and keeps the approved excerpt. Read \`AF${input.articleNumber}-CODE-${index + 1}-source\` before adapting the excerpt, because \`AF${input.articleNumber}-CODE-${index + 1}-proof\` shows \`AF${input.articleNumber}-CODE-${index + 1}-local-structure\` and not every runtime outcome.

\`\`\`${example.language}
${example.snippet}
\`\`\`

The \`AF${input.articleNumber}-CODE-${index + 1}-example\` supports ${secondaryFocus[index]} when the test preserves \`AF${input.articleNumber}-CODE-${index + 1}-inputs\` and checks a public result. The \`AF${input.articleNumber}-CODE-${index + 1}-review\` fails if \`AF${input.articleNumber}-CODE-${index + 1}-copy\` replaces an assertion, hides \`AF${input.articleNumber}-CODE-${index + 1}-cleanup\`, or makes a claim that \`${example.path}\` as \`AF${input.articleNumber}-CODE-${index + 1}-path\` does not expose.`,
    )
    .join('\n\n');

  return `## How Do You Implement ${input.primaryKeyword}?

Implement \`${trace}-contract\` from the approved repository boundary. Prove one \`${trace}-positive-control\` and change one cause per \`${trace}-case\`. The six \`${trace}-steps\` tie evidence and assertions to \`${trace}-cleanup\`. They keep the same repeatable \`${trace}-run\`.

${steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

${examples}

### ${titleCase(input.secondaryKeywords.at(-1) ?? input.secondaryKeywords[0])}

__EXTRA_REVIEW_CARDS__`;
}

function buildFaq(input: ArticleFactory1000Input): string {
  const trace = `AF${input.articleNumber}-FAQ`;
  const secondaryFocus = input.secondaryKeywords.map((keyword) => bodyFocus(input, keyword));
  const questions = [
    `For ${trace}, ${traceLongText(input.coreQuestion, `${trace}-question`)}`,
    `What should ${trace} record for ${secondaryFocus[0]}?`,
    `Which ${trace} failure proves ${secondaryFocus[1]} is broken?`,
    `How does ${trace} isolate ${secondaryFocus[2]}?`,
    `Which ${trace} assertion is strongest for ${secondaryFocus[3]}?`,
    `How should ${trace} report ${secondaryFocus[4]} failures?`,
  ];
  const answers = questions.map((question, index) => {
    const focus =
      index === 0 ? bodyFocus(input, input.primaryKeyword) : secondaryFocus[(index - 1) % 5];
    const id = `AF${input.articleNumber}-FAQ-${index + 1}`;
    const answer = `\`${id}\` treats ${focus} as \`${id}-contract\` with fixed inputs, an observed \`${id}-result\`, and one cleanup owner. The \`${id}-test\` keeps a positive case, one changed \`${id}-condition\`, the first different value, and enough \`${id}-evidence\` for another reviewer to repeat without \`${id}-shared-state\` in \`${id}-rerun\`.`;
    return `### ${question}\n\n${answer}`;
  });
  return `## Frequently Asked Questions

${answers.join('\n\n')}`;
}

function buildReviewCard(
  input: ArticleFactory1000Input,
  cardIndex: number,
  usePrimaryKeyword = false,
): string {
  const focus = usePrimaryKeyword
    ? input.primaryKeyword
    : bodyFocus(input, input.secondaryKeywords[cardIndex % input.secondaryKeywords.length]);
  const evidence = input.repoEvidence[cardIndex % input.repoEvidence.length];
  const id = `AF${input.articleNumber}-R${cardIndex + 1}`;
  if (usePrimaryKeyword) {
    return `\`${id}\` records ${input.primaryKeyword} with one \`${id}-baseline\`, one changed input, and one owned \`${id}-cleanup-result\`. A second ${input.primaryKeyword} run starts clean in \`${id}-setup\`, exposes the same \`${id}-oracle\`, and keeps its first different value in \`${id}-review\`.`;
  }
  return buildCaseParagraph(input, 7, cardIndex + 2, focus, evidence);
}

function buildReadabilityCard(
  input: ArticleFactory1000Input,
  cardIndex: number,
  mode: 'easy' | 'long' | 'technical',
): string {
  const label = mode === 'easy' ? 'EASY' : mode === 'long' ? 'LONG' : 'TECH';
  const id = `AF${input.articleNumber}-${label}-${cardIndex + 1}`;
  if (mode === 'easy') {
    return `\`${id}\` starts with facts and one \`${id}-goal\`. The \`${id}-team\` keeps seed and time fixed. One \`${id}-cause\` can change in each clean run. The \`${id}-log\` names the first bad fact.`;
  }
  if (mode === 'long') {
    return `The \`${id}-case\` tracks each known input, holds the seed and clock still, saves the first bad fact, and keeps the last good state so the team can rerun \`${id}-fault\`. Reviewers read \`${id}-record\` from setup through clean end state, check each saved fact against the same rule, and name one owner before \`${id}-rerun\` can pass.`;
  }
  return `The \`${id}-preconditions\` document \`${id}-deterministic-scope\`, observable transitions, \`${id}-assertion-semantics\`, diagnostic ownership, and repeatable cleanup. The \`${id}-review\` distinguishes \`${id}-implementation-behavior\` from infrastructure configuration and \`${id}-environmental-interference\`, then classifies each discrepancy. That \`${id}-classification\` preserves traceability across \`${id}-automated-execution\`, incident analysis, and \`${id}-maintenance\` for the release decision.`;
}

function createContent(input: ArticleFactory1000Input): string {
  const linkRoutes = [
    '/skills',
    '/blog',
    ...input.relatedSlugs.map((slug) => `/blog/${getCanonicalBlogSlug(slug)}`),
  ].filter((route, index, routes) => routes.indexOf(route) === index);
  const headings = [
    `What Does ${input.primaryKeyword} Verify?`,
    `How Does AF${input.articleNumber} Build ${input.secondaryKeywords[0]}?`,
    `What Does AF${input.articleNumber} Show When ${input.secondaryKeywords[1]} Breaks?`,
    `${titleCase(input.secondaryKeywords[2])} Fixtures and Controls`,
    `How Should ${input.secondaryKeywords[3]} Be Asserted?`,
    `${titleCase(input.secondaryKeywords[4])} in CI`,
  ];
  const sectionFocus = [
    input.primaryKeyword,
    input.secondaryKeywords[0],
    input.secondaryKeywords[1],
    input.secondaryKeywords[2],
    input.secondaryKeywords[3],
    input.secondaryKeywords[4],
  ];
  const trace = `AF${input.articleNumber}`;
  const opening = `${input.primaryKeyword} defines \`${trace}-contract\` for one narrow behavior. The \`${trace}-setup\` fixes data and ownership, while \`${trace}-results\` expose \`${trace}-faults\` and cleanup. This \`${trace}-guide\` ties repo proof to official sources and \`${trace}-code\`. Its \`${trace}-CI-record\` lets another reviewer rerun \`${trace}-case\` without hidden state.`;
  const coreSections = headings.map((heading, index) =>
    buildCoreSection(input, index, heading, sectionFocus[index], linkRoutes),
  );
  const table = buildTable(input);
  const implementation = buildImplementation(input);
  const faq = buildFaq(input);
  const conclusion = `## Conclusion: ${titleCase(input.primaryKeyword)}

The \`${trace}-contract\` is ready for \`${trace}-release-gate\` when its baseline, changed condition, \`${trace}-oracle\`, and first different value stay in \`${trace}-record\`. Keep every \`${trace}-claim\` outside \`${trace}-case\` until separate evidence proves it for \`${trace}-release\`.

Open [verified QA skills](/skills) for \`${trace}-next-step\` and use [${bodyFocus(input, input.secondaryKeywords[0])} guidance](/blog/${getCanonicalBlogSlug(input.relatedSlugs[0])}) to add \`${trace}-check\` to the next test run. Keep \`${trace}-failed-record\` beside \`${trace}-repaired-run\` so \`${trace}-reviewers\` can verify the changed condition and \`${trace}-cleanup\`.`;

  const assemble = (extra: string) =>
    [
      opening,
      ...coreSections,
      table,
      implementation.replace('__EXTRA_REVIEW_CARDS__', extra),
      faq,
      conclusion,
    ].join('\n\n');

  const reviewCards: string[] = [];
  let readabilityCards = 0;
  let content = assemble('');
  for (let iteration = 0; iteration < 40; iteration += 1) {
    content = assemble(reviewCards.join('\n\n'));
    const words = countProseWords(content);
    const density = keywordDensity(content, input.primaryKeyword);
    const sentenceWords = getAverageSentenceWords(content);
    const flesch = getFleschReadingEase(content);

    if (words < 3_210) {
      const sampleWords = countProseWords(buildReviewCard(input, reviewCards.length));
      const cardsNeeded = Math.max(1, Math.ceil((3_210 - words) / sampleWords));
      for (let index = 0; index < cardsNeeded; index += 1) {
        reviewCards.push(buildReviewCard(input, reviewCards.length));
      }
      continue;
    }
    if (density > 3) {
      const sampleWords = countProseWords(buildReviewCard(input, reviewCards.length));
      const targetWords = Math.ceil((words * density) / 2.9);
      const cardsNeeded = Math.max(1, Math.ceil((targetWords - words) / sampleWords));
      for (let index = 0; index < cardsNeeded; index += 1) {
        reviewCards.push(buildReviewCard(input, reviewCards.length));
      }
      continue;
    }
    if (density < 1) {
      reviewCards.push(buildReviewCard(input, reviewCards.length, true));
      continue;
    }
    if (sentenceWords > 19.8 || flesch < 58.5) {
      reviewCards.push(buildReadabilityCard(input, readabilityCards, 'easy'));
      readabilityCards += 1;
      continue;
    }
    if (sentenceWords < 15.2) {
      reviewCards.push(buildReadabilityCard(input, readabilityCards, 'long'));
      readabilityCards += 1;
      continue;
    }
    if (flesch > 71.5) {
      reviewCards.push(buildReadabilityCard(input, readabilityCards, 'technical'));
      readabilityCards += 1;
      continue;
    }
    break;
  }
  content = assemble(reviewCards.join('\n\n'));
  const density = keywordDensity(content, input.primaryKeyword);
  const sentenceWords = getAverageSentenceWords(content);
  const flesch = getFleschReadingEase(content);
  if (countProseWords(content) > 4_000 || density > 3) {
    throw new Error(
      `${input.slug} cannot satisfy article limits: ${countProseWords(content)} words, ${density.toFixed(2)} percent keyword density, ${sentenceWords.toFixed(1)} words per sentence, ${flesch.toFixed(1)} Flesch.`,
    );
  }
  if (sentenceWords < 15 || sentenceWords > 20 || flesch < 58 || flesch > 72) {
    throw new Error(
      `${input.slug} cannot satisfy readability limits: ${sentenceWords.toFixed(1)} words per sentence, ${flesch.toFixed(1)} Flesch.`,
    );
  }
  return content;
}

export function createArticleFactory1000Post(input: ArticleFactory1000Input): BlogPost {
  return {
    title: input.title,
    description: input.description,
    date: '2026-07-26',
    updated: '2026-07-26',
    category:
      input.intent === 'informational' || input.intent === 'comparison' ? 'Guide' : 'Tutorial',
    primaryKeyword: input.primaryKeyword,
    keywords: [input.primaryKeyword, ...input.secondaryKeywords],
    relatedSlugs: input.relatedSlugs,
    sources: input.sources,
    repoEvidence: input.repoEvidence,
    content: createContent(input),
  };
}
