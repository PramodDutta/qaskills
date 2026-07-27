import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 406,
  slug: 'directory-featured-badge-rendering-tests',
  campaignCluster: 'web-platform',
  title: 'Skills Featured Badge Rendering Tests',
  description:
    'skills featured badge rendering tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'skills featured badge rendering tests',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify skills featured badge rendering in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns skills featured badge rendering as implemented by the cited QASkills files. It excludes broad server-rendered skill discovery query state and card presentation guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test skills featured badge rendering',
    'skills featured badge rendering edge cases',
    'skills featured badge rendering integration coverage',
    'skills featured badge rendering Playwright assertions',
    'skills featured badge rendering fallback behavior',
    'skills featured badge rendering regression checklist',
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
      title: 'Build the skills featured badge rendering tests baseline',
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
