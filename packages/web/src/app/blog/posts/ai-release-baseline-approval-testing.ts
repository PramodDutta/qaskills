import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 736,
  slug: 'ai-release-baseline-approval-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'AI Release Baseline Approval Testing',
  description:
    'AI release baseline approval testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'AI release baseline approval testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test ai release baseline approval so a new baseline requires reviewed evidence and cannot be created by the same failing gate it replaces?',
  intentBoundary:
    'Approval control for changing AI eval baselines only, not dataset versioning broadly.',
  secondaryKeywords: [
    'AI release baseline approval test cases',
    'how to test ai release baseline approval',
    'AI release baseline approval regression checks',
    'AI release baseline approval CI validation',
    'AI release baseline approval failure diagnosis',
    'AI release baseline approval QA checklist',
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
      title: 'Build the AI release baseline approval testing baseline',
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
