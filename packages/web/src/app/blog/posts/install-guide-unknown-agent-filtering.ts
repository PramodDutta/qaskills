import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 434,
  slug: 'install-guide-unknown-agent-filtering',
  campaignCluster: 'web-platform',
  title: 'Install Guide Unknown Agent Filtering',
  description:
    'install guide unknown agent filtering: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'install guide unknown agent filtering',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify install guide unknown agent filtering in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns install guide unknown agent filtering as implemented by the cited QASkills files. It excludes broad one skill detail page, its rendered markdown, downloads, and clone entry point guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test install guide unknown agent filtering',
    'install guide unknown agent filtering edge cases',
    'install guide unknown agent filtering integration coverage',
    'install guide unknown agent filtering Playwright assertions',
    'install guide unknown agent filtering fallback behavior',
    'install guide unknown agent filtering regression checklist',
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
      title: 'Build the install guide unknown agent filtering baseline',
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
