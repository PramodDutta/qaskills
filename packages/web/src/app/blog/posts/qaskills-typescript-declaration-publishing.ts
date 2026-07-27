import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 327,
  slug: 'qaskills-typescript-declaration-publishing',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Typescript Declaration Publishing',
  description:
    'QASkills TypeScript declaration publishing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'QASkills TypeScript declaration publishing',
  intent: 'how-to',
  coreQuestion:
    'How should package tests verify that QASkills CLI and SDK declaration files are generated, referenced, and included in published tarballs?',
  intentBoundary: 'Static type artifact delivery, not runtime CJS or ESM resolution.',
  secondaryKeywords: [
    'TypeScript d.ts package test',
    'npm declaration file publishing',
    'tsup dts output',
    'package types field validation',
    'SDK declaration smoke test',
    'missing type definitions regression',
  ],
  repoEvidence: [
    'packages/cli/tsup.config.ts',
    'packages/sdk/tsup.config.ts',
    'packages/cli/package.json',
    'packages/sdk/package.json',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/getting-started',
    '/blog/typescript-testing-patterns-guide',
    '/blog/ai-qa-skills-directory-2026',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
  ],
  relatedSlugs: [
    'typescript-testing-patterns-guide',
    'ai-qa-skills-directory-2026',
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
  ],
  sources: [
    'https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html',
    'https://docs.npmjs.com/cli/v11/commands/npm-pack',
    'https://nodejs.org/api/packages.html',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills TypeScript declaration publishing baseline',
      language: 'typescript',
      path: 'packages/cli/tsup.config.ts',
      snippet:
        "import { defineConfig } from 'tsup';\n\nexport default defineConfig({\n  entry: ['src/index.ts'],\n  format: ['cjs'],\n  dts: true,\n  clean: true,\n  noExternal: ['@qaskills/shared'],\n  banner: {\n    js: '#!/usr/bin/env node',\n  },\n});",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/sdk/tsup.config.ts',
      snippet: '',
    },
  ],
});
