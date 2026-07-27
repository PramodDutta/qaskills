import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 360,
  slug: 'qaskills-k6-project-detection',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills K6 Project Detection',
  description:
    'QASkills k6 project detection: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified cleanup.',
  primaryKeyword: 'QASkills k6 project detection',
  intent: 'how-to',
  coreQuestion:
    'How does QASkills detect k6 from package dependencies, known script names, or a k6 directory?',
  intentBoundary:
    'Recognition of k6 project markers, not authoring load tests or comparing load tools.',
  secondaryKeywords: [
    'detect k6 config',
    'detect load test scripts',
    'k6 directory scanner',
    'qaskills performance framework detection',
    'k6 package dependency evidence',
    'test k6 auto detection',
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
    '/categories/performance-testing',
    '/blog/k6-vs-jmeter-performance-testing',
    '/blog/load-testing-beginners-guide',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
  ],
  relatedSlugs: [
    'k6-vs-jmeter-performance-testing',
    'load-testing-beginners-guide',
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
  ],
  sources: [
    'https://grafana.com/docs/k6/latest/using-k6/k6-options/',
    'https://nodejs.org/api/fs.html',
    'https://docs.npmjs.com/cli/v11/configuring-npm/package-json',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills k6 project detection baseline',
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
