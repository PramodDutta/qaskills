import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 326,
  slug: 'qaskills-pytest-project-detection',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Pytest Project Detection',
  description:
    'QASkills Pytest project detection: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills Pytest project detection',
  intent: 'how-to',
  coreQuestion:
    'How does QASkills identify Pytest projects from pytest.ini, conftest.py, pyproject.toml, and setup.cfg?',
  intentBoundary:
    'Filesystem identification of Pytest projects, not writing tests or comparing Python frameworks.',
  secondaryKeywords: [
    'detect pytest.ini',
    'detect conftest.py',
    'pyproject pytest scanner',
    'setup cfg pytest detection',
    'qaskills python framework detection',
    'pytest config evidence order',
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
    '/blog/pytest-testing-complete-guide',
    '/blog/python-unittest-vs-pytest',
    '/categories/unit-testing',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
  ],
  relatedSlugs: [
    'pytest-testing-complete-guide',
    'python-unittest-vs-pytest',
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
  ],
  sources: [
    'https://docs.pytest.org/en/stable/reference/customize.html',
    'https://nodejs.org/api/fs.html',
    'https://packaging.python.org/en/latest/guides/writing-pyproject-toml/',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills Pytest project detection baseline',
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
