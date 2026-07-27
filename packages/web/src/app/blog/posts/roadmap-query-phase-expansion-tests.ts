import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 481,
  slug: 'roadmap-query-phase-expansion-tests',
  campaignCluster: 'web-platform',
  title: 'Roadmap Query Phase Expansion Tests',
  description:
    'roadmap query phase expansion tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'roadmap query phase expansion tests',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify roadmap query phase expansion in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns roadmap query phase expansion as implemented by the cited QASkills files. It excludes broad local-only roadmap progress, filtering, and accessible controls guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test roadmap query phase expansion',
    'roadmap query phase expansion edge cases',
    'roadmap query phase expansion integration coverage',
    'roadmap query phase expansion Playwright assertions',
    'roadmap query phase expansion fallback behavior',
    'roadmap query phase expansion regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/components/roadmaps/roadmap-explorer.tsx',
    'packages/web/src/app/roadmaps/roadmap-data.ts',
    'packages/web/src/app/roadmaps/roadmap-data.test.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/roadmaps',
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
    'https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage',
    'https://testing-library.com/docs/react-testing-library/intro/',
    'https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/',
  ],
  codeExamples: [
    {
      title: 'Build the roadmap query phase expansion tests baseline',
      language: 'typescript',
      path: 'packages/web/src/components/roadmaps/roadmap-explorer.tsx',
      snippet:
        "export function RoadmapExplorer({ roadmap }: { roadmap: Roadmap }) {\n  const allItems = roadmap.phases.flatMap((phase) => phase.items);\n  const defaultCompleted = allItems.filter((item) => item.defaultCompleted).map((item) => item.id);\n  const storageKey = `qaskills-roadmap-progress:${roadmap.slug}`;\n\n  const [completed, setCompleted] = useState<Set<string>>(() => new Set(defaultCompleted));\n  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(\n    () => new Set(roadmap.phases[0] ? [roadmap.phases[0].id] : []),\n  );\n  const [filter, setFilter] = useState<RoadmapFilter>('all');\n  const [query, setQuery] = useState('');\n  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);\n\n  useEffect(() => {\n    const validItemIds = new Set(\n      roadmap.phases.flatMap((phase) => phase.items.map((item) => item.id)),\n    );",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/roadmaps/roadmap-data.ts',
      snippet:
        '}\n\nexport interface RoadmapPhase {\n  id: string;\n  number: number;\n  title: string;\n  schedule: string;\n  description: string;\n  accent: RoadmapAccent;\n  items: RoadmapItem[];\n}\n\nexport interface RoadmapResource {\n  title: string;\n  description: string;\n  href: string;\n  label: string;\n}',
    },
  ],
});
