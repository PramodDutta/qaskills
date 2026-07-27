import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 399,
  slug: 'skill-publish-success-route-tests',
  campaignCluster: 'web-platform',
  title: 'Skill Publish Success Route Tests',
  description:
    'skill publish success route tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'skill publish success route tests',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify skill publish success route in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns skill publish success route as implemented by the cited QASkills files. It excludes broad QASkills browser editor and publish wizard state transitions guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test skill publish success route',
    'skill publish success route edge cases',
    'skill publish success route integration coverage',
    'skill publish success route Playwright assertions',
    'skill publish success route fallback behavior',
    'skill publish success route regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/app/dashboard/publish/page.tsx',
    'packages/web/src/app/api/skills/route.ts',
    'packages/web/src/lib/analytics.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/how-to-publish',
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
    'https://react.dev/reference/react/useEffect',
    'https://clerk.com/docs/reference/nextjs/auth',
    'https://playwright.dev/docs/test-assertions',
  ],
  codeExamples: [
    {
      title: 'Build the skill publish success route tests baseline',
      language: 'typescript',
      path: 'packages/web/src/app/dashboard/publish/page.tsx',
      snippet:
        "export default function PublishPage() {\n  const { getToken } = useAuth();\n  const [currentStep, setCurrentStep] = useState(0);\n  const [formData, setFormData] = useState<FormData>({\n    name: '',\n    description: '',\n    fullDescription: '',\n    githubUrl: '',\n    version: '1.0.0',\n    license: 'MIT',\n    testingTypes: [],\n    frameworks: [],\n    languages: [],\n    domains: [],\n    agents: [],\n    tags: [],\n  });\n  const [tagInput, setTagInput] = useState('');",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/api/skills/route.ts',
      snippet:
        "{ status: 401 },\n      );\n    }\n\n    // 2. Parse & validate body\n    const body = await request.json();\n    const parsed = publishSkillSchema.safeParse(body);\n    if (!parsed.success) {\n      const messages = parsed.error.issues.map((i) => i.message).join('; ');\n      return NextResponse.json(\n        { error: `Validation failed: ${messages}`, issues: parsed.error.issues },\n        { status: 400 },\n      );\n    }\n    const data = parsed.data;\n\n    // 3. Generate / validate slug\n    const slug = data.slug && data.slug.length > 0 ? data.slug : generateSlug(data.name);",
    },
  ],
});
