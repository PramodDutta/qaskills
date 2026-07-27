import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 435,
  slug: 'markdown-ad-split-code-fence-tests',
  campaignCluster: 'web-platform',
  title: 'Markdown Ad Split Code Fence Tests',
  description:
    'markdown ad split code fence tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'markdown ad split code fence tests',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify markdown ad split code fence in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns markdown ad split code fence as implemented by the cited QASkills files. It excludes broad blog routing, canonicalization, and content helper contracts guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test markdown ad split code fence',
    'markdown ad split code fence edge cases',
    'markdown ad split code fence integration coverage',
    'markdown ad split code fence Playwright assertions',
    'markdown ad split code fence fallback behavior',
    'markdown ad split code fence regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/lib/split-content.ts',
    'packages/web/src/app/blog/[slug]/page.tsx',
    'packages/web/src/components/blog/blog-content.tsx',
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
    'https://github.github.com/gfm/',
    'https://github.com/remarkjs/react-markdown',
    'https://vitest.dev/guide/',
  ],
  codeExamples: [
    {
      title: 'Build the markdown ad split code fence tests baseline',
      language: 'typescript',
      path: 'packages/web/src/lib/split-content.ts',
      snippet:
        "export function splitAtMidHeading(content: string): [string, string] {\n  const lines = content.split('\\n');\n  const headingIdxs: number[] = [];\n  let inFence = false;\n\n  for (let i = 0; i < lines.length; i++) {\n    if (/^\\s*/.test(lines[i])) inFence = !inFence;\n    if (!inFence && /^##\\s/.test(lines[i])) headingIdxs.push(i);\n  }\n\n  // Need enough sections; short posts get only the end-of-article ad.\n  if (headingIdxs.length < 3) return [content, ''];\n\n  const mid = lines.length / 2;\n  let best = -1;\n  let bestDist = Infinity;\n\n  // Skip the first H2 so we never split before the article really begins.",
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
