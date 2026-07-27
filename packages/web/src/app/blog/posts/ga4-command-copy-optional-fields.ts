import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 424,
  slug: 'ga4-command-copy-optional-fields',
  campaignCluster: 'web-platform',
  title: 'Ga4 Command Copy Optional Fields',
  description:
    'GA4 command copy optional fields: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'GA4 command copy optional fields',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify GA4 command copy optional fields in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns GA4 command copy optional fields as implemented by the cited QASkills files. It excludes broad GA4 event names, browser guards, and deliberately bounded payloads guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test GA4 command copy optional fields',
    'GA4 command copy optional fields edge cases',
    'GA4 command copy optional fields integration coverage',
    'GA4 command copy optional fields Playwright assertions',
    'GA4 command copy optional fields fallback behavior',
    'GA4 command copy optional fields regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/lib/analytics.ts',
    'packages/web/src/components/skills/install-button.tsx',
    'packages/web/src/components/packs/packs-grid.tsx',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/packs',
    '/leaderboard',
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
    'https://developers.google.com/analytics/devguides/collection/ga4/events',
    'https://developers.google.com/analytics/devguides/collection/ga4/reference/events',
    'https://vitest.dev/guide/',
  ],
  codeExamples: [
    {
      title: 'Build the GA4 command copy optional fields baseline',
      language: 'typescript',
      path: 'packages/web/src/lib/analytics.ts',
      snippet:
        "export function trackEvent(\n  eventName: string,\n  params?: Record<string, string | number | boolean>,\n) {\n  if (typeof window !== 'undefined' && window.gtag) {\n    window.gtag('event', eventName, params);\n  }\n}\n\n//  Skill Events \n\n/** User clicks \"Install\" / copies the install command */\nexport function trackSkillInstall(skillSlug: string, agent?: string) {\n  trackEvent('skill_install', {\n    skill_slug: skillSlug,\n    agent: agent ?? 'unknown',\n    content_type: 'skill',\n  });",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/components/skills/install-button.tsx',
      snippet:
        'return (\n    <div className="flex items-center gap-2">\n      <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 font-mono text-sm flex-1">\n        <Terminal className="h-4 w-4 text-muted-foreground shrink-0" />\n        <code className="truncate">{command}</code>\n      </div>\n      <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Copy install command">\n        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}\n      </Button>\n    </div>\n  );\n}',
    },
  ],
});
