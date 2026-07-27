import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 735,
  slug: 'ai-post-release-regression-replay',
  campaignCluster: 'ai-llm-rag',
  title: 'AI Post Release Regression Replay',
  description:
    'AI post release regression replay: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'AI post release regression replay',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test ai post release regression replay so production failures become reproducible cases and verify both the fix and the release rollback path?',
  intentBoundary:
    'Production-failure replay into release suites only, not offline versus online eval strategy.',
  secondaryKeywords: [
    'AI post release regression replay test cases',
    'how to test ai post release regression replay',
    'AI post release regression replay regression checks',
    'AI post release regression replay CI validation',
    'AI post release regression replay failure diagnosis',
    'AI post release regression replay QA checklist',
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
      title: 'Build the AI post release regression replay baseline',
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
