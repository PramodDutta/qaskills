import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 450,
  slug: 'typesense-pagination-default-size-tests',
  campaignCluster: 'web-platform',
  title: 'Typesense Pagination Default Size Tests',
  description:
    'Typesense pagination default size tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Typesense pagination default size tests',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify Typesense pagination default size in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns Typesense pagination default size as implemented by the cited QASkills files. It excludes broad Typesense client construction and typed search result mapping guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test Typesense pagination default size',
    'Typesense pagination default size edge cases',
    'Typesense pagination default size integration coverage',
    'Typesense pagination default size Playwright assertions',
    'Typesense pagination default size fallback behavior',
    'Typesense pagination default size regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/lib/typesense/client.ts#evidence-1',
    'packages/web/src/lib/typesense/search.ts',
    'packages/web/src/lib/typesense/client.ts#evidence-3',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/leaderboard',
    '/categories',
    '/agents',
    '/blog/react-nextjs-testing-complete-guide',
    '/blog/api-testing-complete-guide',
    '/blog/database-testing-automation-guide',
    '/blog/authentication-authorization-testing-guide',
  ],
  relatedSlugs: [
    'react-nextjs-testing-complete-guide',
    'api-testing-complete-guide',
    'database-testing-automation-guide',
    'authentication-authorization-testing-guide',
  ],
  sources: [
    'https://typesense.org/docs/29.0/api/api-clients.html',
    'https://typesense.org/docs/29.0/api/search.html',
    'https://typesense.org/docs/29.0/api/collections.html',
  ],
  codeExamples: [
    {
      title: 'Build the Typesense pagination default size tests baseline',
      language: 'typescript',
      path: 'packages/web/src/lib/typesense/client.ts',
      snippet:
        "export function getTypesenseClient(): Client | null {\n  if (!process.env.TYPESENSE_API_KEY) return null;\n  if (!client) {\n    client = new Client({\n      nodes: [\n        {\n          host: process.env.TYPESENSE_HOST || 'localhost',\n          port: parseInt(process.env.TYPESENSE_PORT || '8108', 10),\n          protocol: process.env.TYPESENSE_PROTOCOL || 'http',\n        },\n      ],\n      apiKey: process.env.TYPESENSE_API_KEY,\n      connectionTimeoutSeconds: 5,\n    });\n  }\n  return client;\n}",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/lib/typesense/search.ts',
      snippet:
        "if (params.frameworks?.length) {\n    filterParts.push(`frameworks:=[${params.frameworks.join(',')}]`);\n  }\n  if (params.languages?.length) {\n    filterParts.push(`languages:=[${params.languages.join(',')}]`);\n  }\n  if (params.domains?.length) {\n    filterParts.push(`domains:=[${params.domains.join(',')}]`);\n  }\n  if (params.agents?.length) {\n    filterParts.push(`agents:=[${params.agents.join(',')}]`);\n  }\n  if (params.verifiedOnly) {\n    filterParts.push('verified:=true');\n  }\n\n  const sortMap: Record<string, string> = {\n    trending: 'installCount:desc',",
    },
  ],
});
