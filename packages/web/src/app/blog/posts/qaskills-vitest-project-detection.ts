import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 372,
  slug: 'qaskills-vitest-project-detection',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Vitest Project Detection',
  description:
    'QASkills Vitest project detection: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills Vitest project detection',
  intent: 'how-to',
  coreQuestion:
    'How does QASkills detect Vitest from supported config filenames or package.json dependencies?',
  intentBoundary: 'Vitest project identification, not Vitest test design or Jest comparison.',
  secondaryKeywords: [
    'detect vitest config',
    'vitest dependency scanner',
    'vitest.config.mts detection',
    'qaskills unit framework evidence',
    'test vitest auto detection',
    'package json vitest detection',
  ],
  repoEvidence: [
    'packages/cli/src/lib/framework-detector.ts#evidence-1',
    'packages/cli/src/lib/framework-detector.ts#evidence-2',
    'packages/cli/src/lib/framework-detector.ts#evidence-3',
    'packages/cli/src/lib/framework-detector.ts#evidence-4',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/unit-testing',
    '/blog/jest-vs-vitest-2026',
    '/blog/vitest-config-setup-guide-2026',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
  ],
  relatedSlugs: [
    'jest-vs-vitest-2026',
    'vitest-config-setup-guide-2026',
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
  ],
  sources: [
    'https://vitest.dev/config/',
    'https://nodejs.org/api/fs.html',
    'https://docs.npmjs.com/cli/v11/configuring-npm/package-json',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills Vitest project detection baseline',
      language: 'typescript',
      path: 'packages/cli/src/lib/framework-detector.ts',
      snippet:
        'export interface DetectedFramework {\n  id: string;\n  name: string;\n  /** The file or directory that triggered the detection. */\n  evidence: string;\n}\n\n// ---------------------------------------------------------------------------\n// Helpers\n// ---------------------------------------------------------------------------\n\nfunction fileExists(p: string): boolean {\n  try {\n    fs.accessSync(p, fs.constants.F_OK);\n    return true;\n  } catch {\n    return false;\n  }',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/cli/src/lib/framework-detector.ts',
      snippet:
        "try {\n    fs.accessSync(p, fs.constants.F_OK);\n    return true;\n  } catch {\n    return false;\n  }\n}\n\nfunction readFileSafe(p: string): string | null {\n  try {\n    return fs.readFileSync(p, 'utf-8');\n  } catch {\n    return null;\n  }\n}\n\nfunction readJsonSafe(p: string): Record<string, unknown> | null {\n  const raw = readFileSafe(p);",
    },
  ],
});
