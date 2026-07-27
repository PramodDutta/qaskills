import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 313,
  slug: 'qaskills-selenium-project-detection',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Selenium Project Detection',
  description:
    'QASkills Selenium project detection: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills Selenium project detection',
  intent: 'how-to',
  coreQuestion:
    'How does QASkills detect Selenium across JavaScript, Java, and Python dependency files without executing project code?',
  intentBoundary:
    'Cross-language project evidence only, not Selenium setup, Grid, or framework comparison.',
  secondaryKeywords: [
    'selenium webdriver dependency detection',
    'detect selenium pom xml',
    'detect selenium requirements txt',
    'webdriverio project detection',
    'cross language framework scanner',
    'qaskills selenium evidence',
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
    '/blog/selenium-tutorial-complete-beginners-2026',
    '/blog/rest-assured-java-api-testing',
    '/categories/e2e-testing',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
  ],
  relatedSlugs: [
    'selenium-tutorial-complete-beginners-2026',
    'rest-assured-java-api-testing',
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
  ],
  sources: [
    'https://www.selenium.dev/documentation/',
    'https://maven.apache.org/pom.html',
    'https://pip.pypa.io/en/stable/reference/requirements-file-format/',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills Selenium project detection baseline',
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
