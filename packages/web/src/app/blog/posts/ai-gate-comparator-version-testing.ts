import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 642,
  slug: 'ai-gate-comparator-version-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'AI Gate Comparator Version Testing',
  description:
    'AI gate comparator version testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'AI gate comparator version testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test ai gate comparator version so every decision records comparator code, policy revision, rounding, and aggregation for reproduction?',
  intentBoundary:
    'Version identity of quality-gate decision logic only, not baseline or artifact retention.',
  secondaryKeywords: [
    'AI gate comparator version test cases',
    'how to test ai gate comparator version',
    'AI gate comparator version regression checks',
    'AI gate comparator version CI validation',
    'AI gate comparator version failure diagnosis',
    'AI gate comparator version QA checklist',
  ],
  repoEvidence: [
    'seed-skills/ai-release-guardian/SKILL.md',
    'packages/web/src/app/blog/posts/article-factory-250-publication.test.ts',
    'packages/web/e2e/article-factory-250-2026-07-25.e2e.ts',
    'docs/product/REGRESSION-GAPS-2026-07.md',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/llm-evaluation-ci-cd-quality-gates',
    '/blog/llm-regression-testing-guide-2026',
    '/blog/llm-non-determinism-flaky-eval-guide-2026',
    '/blog/testing-llm-applications-guide',
  ],
  relatedSlugs: [
    'llm-evaluation-ci-cd-quality-gates',
    'llm-regression-testing-guide-2026',
    'llm-non-determinism-flaky-eval-guide-2026',
    'testing-llm-applications-guide',
  ],
  sources: [
    'https://www.nist.gov/itl/ai-risk-management-framework',
    'https://platform.openai.com/docs/guides/evals',
    'https://docs.github.com/en/actions',
  ],
  codeExamples: [
    {
      title: 'Build the AI gate comparator version testing baseline',
      language: 'bash',
      path: 'seed-skills/ai-release-guardian/SKILL.md',
      snippet:
        '# PR diff (preferred: matches what will actually merge)\ngh pr diff <number> > release.diff\ngh pr view <number> --json title,body,files,baseRefName,headRefName\n\n# Or a commit range against the release base\ngit diff origin/main...HEAD > release.diff\ngit diff --stat origin/main...HEAD',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/blog/posts/article-factory-250-publication.test.ts',
      snippet:
        "getFleschReadingEase,\n  getFirstWords,\n  getInternalLinksPerThousandWords,\n  getKeywordDensity,\n  hasGfmTable,\n  hasOrderedProcedure,\n  normalizeArticleText,\n} from './article-factory-quality';\nimport { posts, postList } from './index';\nimport { countCodeBlocks } from './seo-cluster-article';\nimport { extractBlogSlugs, findHighestShingleOverlap } from './seo-cluster-quality';\n\nconst SITE_TITLE_SUFFIX = ' | QASkills.sh';\nconst REPO_ROOT = path.resolve(process.cwd(), '../..');\nconst selectedReport = JSON.parse(\n  fs.readFileSync(\n    path.resolve(REPO_ROOT, 'docs/seo/article-factory-250-2026-07-25/selected.json'),\n    'utf8',",
    },
  ],
});
