import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 380,
  slug: 'article-list-pagination-canonical-url-tests',
  campaignCluster: 'web-platform',
  title: 'Blog Pagination Canonical URL Tests',
  description:
    'blog pagination canonical URL tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'blog pagination canonical URL tests',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify blog pagination canonical URL in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns blog pagination canonical URL as implemented by the cited QASkills files. It excludes broad blog routing, canonicalization, and content helper contracts guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test blog pagination canonical URL',
    'blog pagination canonical URL edge cases',
    'blog pagination canonical URL integration coverage',
    'blog pagination canonical URL Playwright assertions',
    'blog pagination canonical URL fallback behavior',
    'blog pagination canonical URL regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/app/blog/page.tsx',
    'packages/web/src/app/blog/page.test.tsx',
    'packages/web/src/app/blog/posts/index.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/getting-started',
    '/faq',
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
    'https://nextjs.org/docs/app/api-reference/functions/generate-metadata',
    'https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams',
    'https://playwright.dev/docs/test-assertions',
  ],
  codeExamples: [
    {
      title: 'Build the blog pagination canonical URL tests baseline',
      language: 'typescript',
      path: 'packages/web/src/app/blog/page.tsx',
      snippet:
        "export async function generateMetadata({ searchParams }: BlogPageProps): Promise<Metadata> {\n  const requestedPage = parsePage((await searchParams).page);\n  const title =\n    requestedPage === 1\n      ? 'QA Testing Blog: Tutorials, Guides & AI Agent Tips'\n      : `QA Testing Blog Articles - Page ${requestedPage}`;\n  const canonical =\n    requestedPage === 1\n      ? 'https://qaskills.sh/blog'\n      : `https://qaskills.sh/blog?page=${requestedPage}`;\n  const socialTitle = `${title} | QASkills.sh`;\n  const ogImage = `/api/og?title=${encodeURIComponent(title)}&description=${encodeURIComponent(\n    requestedPage === 1\n      ? BLOG_DESCRIPTION\n      : `Browse QA testing tutorials and guides on page ${requestedPage} of the QASkills.sh blog.`,\n  )}`;\n\n  return {",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/blog/page.test.tsx',
      snippet:
        ");\n\nvi.mock('next/link', () => ({ default: () => null }));\nvi.mock('next/navigation', () => ({ notFound: () => undefined }));\nvi.mock('@/components/ui/card', () => ({\n  Card: () => null,\n  CardHeader: () => null,\n  CardTitle: () => null,\n  CardDescription: () => null,\n}));\nvi.mock('@/components/ui/badge', () => ({ Badge: () => null }));\nvi.mock('@/lib/json-ld', () => ({ generateBreadcrumbJsonLd: () => ({}) }));\nvi.mock('@/lib/blog-canonical', () => ({ isCanonicalBlogSlug: () => true }));\nvi.mock('./posts', () => ({ postList: mockedPostList, posts: {} }));\n\nimport BlogPage, { generateMetadata } from './page';\n\nfunction collectHrefs(node: ReactNode): string[] {",
    },
  ],
});
