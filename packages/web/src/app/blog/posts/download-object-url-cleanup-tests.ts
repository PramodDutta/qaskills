import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 414,
  slug: 'download-object-url-cleanup-tests',
  campaignCluster: 'web-platform',
  title: 'Download Object URL Cleanup Tests',
  description:
    'download object URL cleanup tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'download object URL cleanup tests',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify download object URL cleanup in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns download object URL cleanup as implemented by the cited QASkills files. It excludes broad one skill detail page, its rendered markdown, downloads, and clone entry point guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test download object URL cleanup',
    'download object URL cleanup edge cases',
    'download object URL cleanup integration coverage',
    'download object URL cleanup Playwright assertions',
    'download object URL cleanup fallback behavior',
    'download object URL cleanup regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/components/skills/skill-download-buttons.tsx',
    'packages/web/src/app/api/skills/[id]/content/route.ts',
    'packages/web/src/lib/skill-markdown.ts',
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
    'https://developer.mozilla.org/en-US/docs/Web/API/Blob',
    'https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static',
    'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API',
  ],
  codeExamples: [
    {
      title: 'Build the download object URL cleanup tests baseline',
      language: 'typescript',
      path: 'packages/web/src/components/skills/skill-download-buttons.tsx',
      snippet:
        "export function SkillDownloadButtons({\n  slug,\n  name,\n  version,\n  description,\n  agents,\n}: SkillDownloadButtonsProps) {\n  const [downloading, setDownloading] = useState(false);\n\n  const handleDownloadSkillMd = async () => {\n    setDownloading(true);\n    try {\n      const res = await fetch(`/api/skills/${encodeURIComponent(slug)}/content`);\n      if (!res.ok) throw new Error('Failed to fetch');\n      const content = await res.text();\n      triggerDownload(`${slug}.SKILL.md`, content);\n      trackEvent('download_skill_md', { skill_slug: slug, content_type: 'skill' });\n    } catch {",
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
