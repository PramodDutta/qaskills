import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 443,
  slug: 'skill-markdown-heading-hierarchy-tests',
  campaignCluster: 'web-platform',
  title: 'Skill Markdown Heading Hierarchy Tests',
  description:
    'skill markdown heading hierarchy tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'skill markdown heading hierarchy tests',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify skill markdown heading hierarchy in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns skill markdown heading hierarchy as implemented by the cited QASkills files. It excludes broad one skill detail page, its rendered markdown, downloads, and clone entry point guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test skill markdown heading hierarchy',
    'skill markdown heading hierarchy edge cases',
    'skill markdown heading hierarchy integration coverage',
    'skill markdown heading hierarchy Playwright assertions',
    'skill markdown heading hierarchy fallback behavior',
    'skill markdown heading hierarchy regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/lib/skill-markdown.ts',
    'packages/web/src/app/api/skills/[id]/content/route.ts',
    'packages/web/src/components/skills/skill-description.tsx',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/getting-started',
    '/how-to-publish',
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
    'https://github.com/remarkjs/react-markdown',
    'https://github.com/rehypejs/rehype-sanitize',
    'https://github.github.com/gfm/',
  ],
  codeExamples: [
    {
      title: 'Build the skill markdown heading hierarchy tests baseline',
      language: 'typescript',
      path: 'packages/web/src/lib/skill-markdown.ts',
      snippet:
        "export interface SkillMarkdownRow {\n  name: string;\n  description: string;\n  version: string | null;\n  authorName: string | null;\n  license: string | null;\n  githubUrl: string | null;\n  fullDescription: string | null;\n  tags: unknown;\n  testingTypes: unknown;\n  frameworks: unknown;\n  languages: unknown;\n  domains: unknown;\n  agents: unknown;\n}\n\nconst ARRAY_FIELDS = ['tags', 'testingTypes', 'frameworks', 'languages', 'domains', 'agents'] as const;",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/api/skills/[id]/content/route.ts',
      snippet:
        "if (rows.length === 0) {\n      const fallback = fallbackContent(id);\n      if (fallback) return markdownResponse(fallback);\n      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });\n    }\n\n    const row = rows[0];\n    return markdownResponse(buildSkillMarkdown(row));\n  } catch {\n    const fallback = fallbackContent(id);\n    if (fallback) return markdownResponse(fallback);\n    return NextResponse.json({ error: 'Failed to fetch skill content' }, { status: 500 });\n  }\n}",
    },
  ],
});
