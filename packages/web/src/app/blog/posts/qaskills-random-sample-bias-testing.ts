import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 364,
  slug: 'qaskills-random-sample-bias-testing',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Random Sample Bias Testing',
  description:
    'QASkills random sample bias testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills random sample bias testing',
  intent: 'informational',
  coreQuestion:
    'What should QA teams verify for QASkills random sample bias testing, including sort-with-random comparator bias in catalog sampling?',
  intentBoundary:
    'Covers sort-with-random comparator bias in catalog sampling. Excludes telemetry sampling.',
  secondaryKeywords: [
    'how to test random sample bias',
    'random sample bias test cases',
    'random sample bias edge cases',
    'random sample bias CI validation',
    'random sample bias failure diagnostics',
    'random sample bias regression coverage',
  ],
  repoEvidence: [
    'packages/cli/e2e/e2e.mjs#evidence-1',
    'packages/cli/e2e/e2e.mjs#evidence-2',
    'packages/cli/e2e/e2e.mjs#evidence-3',
    '.github/workflows/cli-publish.yml',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/mcp',
    '/getting-started',
    '/blog/validate-skill-md-in-ci-pipeline',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
    '/blog/how-to-write-high-quality-qa-skills',
  ],
  relatedSlugs: [
    'validate-skill-md-in-ci-pipeline',
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
    'how-to-write-high-quality-qa-skills',
  ],
  sources: [
    'https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html',
    'https://json-schema.org/draft/2020-12',
    'https://semver.org/',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills random sample bias testing baseline',
      language: 'javascript',
      path: 'packages/cli/e2e/e2e.mjs',
      snippet:
        "* is published; cli-publish.yml runs it between build and npm publish.\n *\n * Covers:\n *   1. Every fast command exits 0 (--version, --help, search, info, list)\n *   2. init regression pack (non-TTY scaffold, flag overrides, bad-value exit)\n *   3. Random catalog sample: install 5-10 registry skills into a temp dir,\n *      verify each delivers a real SKILL.md (frontmatter + body), then remove\n *   4. Registry contract the CLI depends on: /content and /artifact respond,\n *      artifact checksum header matches the body\n *\n * Telemetry is disabled (QASKILLS_TELEMETRY=0) so gate runs never inflate\n * install counts.\n */\n\nimport { execFileSync } from 'node:child_process';\nimport { createHash } from 'node:crypto';\nimport fs from 'node:fs';\nimport os from 'node:os';",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'javascript',
      path: 'packages/cli/e2e/e2e.mjs',
      snippet:
        "*/\n\nimport { execFileSync } from 'node:child_process';\nimport { createHash } from 'node:crypto';\nimport fs from 'node:fs';\nimport os from 'node:os';\nimport path from 'node:path';\nimport { fileURLToPath } from 'node:url';\n\nconst __dirname = path.dirname(fileURLToPath(import.meta.url));\nconst CLI = path.resolve(__dirname, '../dist/index.js');\nconst API = process.env.QASKILLS_API_URL || 'https://qaskills.sh';\nconst SAMPLE_MIN = 5;\nconst SAMPLE_MAX = 10;\n\nconst env = {\n  ...process.env,\n  QASKILLS_TELEMETRY: '0', // never pollute real install counts from the gate",
    },
  ],
});
