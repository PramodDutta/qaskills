import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 365,
  slug: 'qaskills-mcp-publisher-binary-pinning',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills MCP Publisher Binary Pinning',
  description:
    'QASkills MCP publisher binary pinning: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills MCP publisher binary pinning',
  intent: 'troubleshooting',
  coreQuestion:
    'How should QA teams diagnose QASkills MCP publisher binary pinning, including latest-release downloads making registry publication non-reproducible?',
  intentBoundary:
    'Covers latest-release downloads making registry publication non-reproducible. Excludes npm dependency lockfiles.',
  secondaryKeywords: [
    'how to test MCP publisher binary pinning',
    'MCP publisher binary pinning test cases',
    'MCP publisher binary pinning edge cases',
    'MCP publisher binary pinning CI validation',
    'MCP publisher binary pinning failure diagnostics',
    'MCP publisher binary pinning regression coverage',
  ],
  repoEvidence: [
    'packages/mcp/package.json',
    'packages/mcp/server.json',
    'packages/mcp/tsup.config.ts',
    '.github/workflows/mcp-publish.yml',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/getting-started',
    '/how-to-publish',
    '/blog/qaskills-cli-npm-binary-testing',
    '/blog/mcp-package-registry-version-drift-tests',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
  ],
  relatedSlugs: [
    'qaskills-cli-npm-binary-testing',
    'mcp-package-registry-version-drift-tests',
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
  ],
  sources: [
    'https://docs.npmjs.com/files/package.json/',
    'https://docs.github.com/en/actions/tutorials/publish-packages/publish-nodejs-packages',
    'https://pnpm.io/continuous-integration',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills MCP publisher binary pinning baseline',
      language: 'json',
      path: 'packages/mcp/package.json',
      snippet:
        '{\n  "name": "@qaskills/mcp",\n  "version": "0.1.2",\n  "mcpName": "io.github.PramodDutta/qaskills",\n  "description": "MCP server for QASkills.sh - search, inspect, and install 400+ QA testing skills into Claude Code, Cursor, and any MCP client.",\n  "bin": {\n    "qaskills-mcp": "./dist/index.js"\n  },\n  "main": "./dist/index.js",\n  "types": "./dist/index.d.ts",\n  "files": [\n    "dist",\n    "README.md"\n  ],\n  "repository": {\n    "type": "git",\n    "url": "https://github.com/PramodDutta/qaskills.git",\n    "directory": "packages/mcp"',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'json',
      path: 'packages/mcp/server.json',
      snippet:
        '"identifier": "@qaskills/mcp",\n      "version": "0.1.2",\n      "transport": {\n        "type": "stdio"\n      },\n      "environmentVariables": [\n        {\n          "description": "Override the QASkills API base URL (defaults to https://qaskills.sh)",\n          "isRequired": false,\n          "format": "string",\n          "isSecret": false,\n          "name": "QASKILLS_API_URL"\n        }\n      ]\n    }\n  ]\n}',
    },
  ],
});
