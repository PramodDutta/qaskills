import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 398,
  slug: 'comparison-static-slug-generation-tests',
  campaignCluster: 'web-platform',
  title: 'Comparison Static Slug Generation Tests',
  description:
    'comparison static slug generation tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'comparison static slug generation tests',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify comparison static slug generation in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns comparison static slug generation as implemented by the cited QASkills files. It excludes broad registry-driven comparison, skills-for, and roadmap page generation guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test comparison static slug generation',
    'comparison static slug generation edge cases',
    'comparison static slug generation integration coverage',
    'comparison static slug generation Playwright assertions',
    'comparison static slug generation fallback behavior',
    'comparison static slug generation regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/lib/compare-data.ts',
    'packages/web/src/app/compare/[slug]/page.tsx',
    'packages/web/src/app/sitemap.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/compare',
    '/skills-for',
    '/roadmaps',
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
    'https://nextjs.org/docs/app/api-reference/functions/generate-static-params',
    'https://nextjs.org/docs/app/api-reference/functions/generate-metadata',
    'https://schema.org/CollectionPage',
  ],
  codeExamples: [
    {
      title: 'Build the comparison static slug generation tests baseline',
      language: 'typescript',
      path: 'packages/web/src/lib/compare-data.ts',
      snippet:
        'export interface CompareTool {\n  name: string;\n  tagline: string;\n  creator: string;\n  license: string;\n  firstRelease: string;\n  language?: string;\n  skillSlug?: string; // qaskills.sh skill slug if any\n  installCmd?: string; // e.g. `npx @qaskills/cli add playwright-e2e`\n}\n\nexport interface CompareMatrixRow {\n  feature: string;\n  a: string;\n  b: string;\n}\n\nexport interface CompareEntry {',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/compare/[slug]/page.tsx',
      snippet:
        "return {\n    title: entry.title,\n    description: entry.description,\n    alternates: { canonical: url },\n    openGraph: {\n      title: entry.title,\n      description: entry.description,\n      url,\n      type: 'article',\n    },\n    twitter: {\n      card: 'summary_large_image',\n      title: entry.title,\n      description: entry.description,\n    },\n  };\n}",
    },
  ],
});
