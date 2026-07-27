import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 403,
  slug: 'directory-card-accent-fallback-tests',
  campaignCluster: 'web-platform',
  title: 'Skills Card Accent Fallback Tests',
  description:
    'skills card accent fallback tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'skills card accent fallback tests',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify skills card accent fallback in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns skills card accent fallback as implemented by the cited QASkills files. It excludes broad server-rendered skill discovery query state and card presentation guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test skills card accent fallback',
    'skills card accent fallback edge cases',
    'skills card accent fallback integration coverage',
    'skills card accent fallback Playwright assertions',
    'skills card accent fallback fallback behavior',
    'skills card accent fallback regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/components/skills/skill-card.tsx',
    'packages/web/src/components/skills/quality-badge.tsx',
    'packages/web/src/lib/skills-promotion.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories',
    '/agents',
    '/getting-started',
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
    'https://testing-library.com/docs/react-testing-library/intro/',
    'https://playwright.dev/docs/test-components',
    'https://react.dev/reference/react/useState',
  ],
  codeExamples: [
    {
      title: 'Build the skills card accent fallback tests baseline',
      language: 'typescript',
      path: 'packages/web/src/components/skills/skill-card.tsx',
      snippet:
        "export function SkillCard({ skill, averageRating }: SkillCardProps) {\n  const isHighlighted = isHighlightedSkill(skill.slug);\n  const promotionLabel = getSkillPromotionLabel(skill.slug, skill.createdAt);\n  const isNew = promotionLabel === 'NEW';\n  const primaryType = skill.testingTypes[0] || 'e2e';\n  const accent = typeAccents[primaryType] ?? 'bg-gray-500';\n\n  return (\n    <Link href={`/skills/${skill.author}/${skill.slug}`}>\n      <Card\n        className={`group relative h-full overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${\n          isHighlighted\n            ? 'border-yellow-300 dark:border-yellow-700/50 bg-gradient-to-br from-yellow-50 to-amber-50/50 dark:from-yellow-950/30 dark:to-amber-950/10 hover:border-yellow-400 shadow-sm'\n            : 'hover:border-primary/30'\n        }`}\n      >\n        {/* Left accent bar */}\n        <div",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/components/skills/quality-badge.tsx',
      snippet:
        "md: 'px-2 py-1 text-sm',\n    lg: 'px-3 py-1.5 text-base',\n  };\n\n  return (\n    <span className={cn('inline-flex items-center rounded-md font-semibold', color, sizeClasses[size])}>\n      {score}\n    </span>\n  );\n}",
    },
  ],
});
