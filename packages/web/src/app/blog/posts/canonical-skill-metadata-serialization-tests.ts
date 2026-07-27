import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 386,
  slug: 'canonical-skill-metadata-serialization-tests',
  campaignCluster: 'web-platform',
  title: 'Canonical Skill Metadata Serialization Tests',
  description:
    'canonical skill metadata serialization tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'canonical skill metadata serialization tests',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify canonical skill metadata serialization in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns canonical skill metadata serialization as implemented by the cited QASkills files. It excludes broad one skill detail page, its rendered markdown, downloads, and clone entry point guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test canonical skill metadata serialization',
    'canonical skill metadata serialization edge cases',
    'canonical skill metadata serialization integration coverage',
    'canonical skill metadata serialization Playwright assertions',
    'canonical skill metadata serialization fallback behavior',
    'canonical skill metadata serialization regression checklist',
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
      title: 'Build the canonical skill metadata serialization tests baseline',
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
