import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 444,
  slug: 'question-answer-markdown-heading-parser-tests',
  campaignCluster: 'web-platform',
  title: 'FAQ Markdown Heading Parser Tests',
  description:
    'FAQ markdown heading parser tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'FAQ markdown heading parser tests',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify FAQ markdown heading parser in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns FAQ markdown heading parser as implemented by the cited QASkills files. It excludes broad blog routing, canonicalization, and content helper contracts guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test FAQ markdown heading parser',
    'FAQ markdown heading parser edge cases',
    'FAQ markdown heading parser integration coverage',
    'FAQ markdown heading parser Playwright assertions',
    'FAQ markdown heading parser fallback behavior',
    'FAQ markdown heading parser regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/lib/extract-faqs.ts',
    'packages/web/src/app/blog/[slug]/page.tsx',
    'packages/web/src/lib/json-ld.ts',
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
    'https://schema.org/FAQPage',
    'https://github.github.com/gfm/',
    'https://vitest.dev/guide/',
  ],
  codeExamples: [
    {
      title: 'Build the FAQ markdown heading parser tests baseline',
      language: 'typescript',
      path: 'packages/web/src/lib/extract-faqs.ts',
      snippet:
        'export interface FAQItem {\n  q: string;\n  a: string;\n}\n\n// Matches H2 like:\n//   ## FAQ\n//   ## FAQs\n//   ## Frequently Asked Questions\n//   ## 18. Frequently Asked Questions\n//   ## 7. FAQ\n//   ## Common Questions\n//   ## Q & A\nconst FAQ_SECTION_REGEX =\n  /^##\\s+(?:\\d+\\.\\s+)?(?:frequently\\s+asked\\s+questions(?:\\s+(?:about|for|on)\\s+[^\\n]+)?|faqs?(?:\\s*:\\s*[^\\n]+)?|q\\s*&\\s*a|common\\s+questions|questions?\\s*&\\s*answers?|questions?)\\s*$/im;\n\n/**\n * Find FAQ section in markdown body. Returns the text after the heading up to',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/blog/[slug]/page.tsx',
      snippet:
        "return source;\n  }\n}\n\nexport async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {\n  const { slug } = await params;\n  const canonicalSlug = getCanonicalBlogSlug(slug);\n  const post = posts[canonicalSlug];\n  if (!post) return { title: 'Post Not Found' };\n\n  const ogImageUrl =\n    post.image ||\n    `/api/og?title=${encodeURIComponent(post.title)}&description=${encodeURIComponent(post.description)}`;\n  const ogImageDimensions = post.image\n    ? { width: 1600, height: 900 }\n    : { width: 1200, height: 630 };\n\n  return {",
    },
  ],
});
