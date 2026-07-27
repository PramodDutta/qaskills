import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 390,
  slug: 'clone-auth-disabled-link-tests',
  campaignCluster: 'web-platform',
  title: 'Clone Auth Disabled Link Tests',
  description:
    'clone auth disabled link tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified cleanup.',
  primaryKeyword: 'clone auth disabled link tests',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify clone auth disabled link in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns clone auth disabled link as implemented by the cited QASkills files. It excludes broad supported Clerk loading, signed-in, signed-out, and recovery states guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test clone auth disabled link',
    'clone auth disabled link edge cases',
    'clone auth disabled link integration coverage',
    'clone auth disabled link Playwright assertions',
    'clone auth disabled link fallback behavior',
    'clone auth disabled link regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/components/skills/clone-button.tsx',
    'packages/web/src/components/skills/skill-creator.tsx',
    'packages/web/src/components/skills/clone-button.test.tsx',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/getting-started',
    '/how-to-publish',
    '/packs',
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
    'https://clerk.com/docs/reference/nextjs/auth',
    'https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams',
    'https://testing-library.com/docs/react-testing-library/intro/',
  ],
  codeExamples: [
    {
      title: 'Build the clone auth disabled link tests baseline',
      language: 'typescript',
      path: 'packages/web/src/components/skills/clone-button.tsx',
      snippet:
        'export function CloneButton({ author, slug }: CloneButtonProps) {\n  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {\n    return (\n      <Button variant="outline" className="w-full" asChild>\n        <Link href={`/dashboard/create?clone=${encodeURIComponent(`${author}/${slug}`)}`}>\n          <GitFork className="h-4 w-4" /> Clone & Edit\n        </Link>\n      </Button>\n    );\n  }\n\n  return <AuthenticatedCloneButton author={author} slug={slug} />;\n}\n\nfunction AuthenticatedCloneButton({ author, slug }: CloneButtonProps) {\n  const { isSignedIn } = useAuth();\n  const router = useRouter();',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/components/skills/skill-creator.tsx',
      snippet:
        "const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');\n  const textareaRef = useRef<HTMLTextAreaElement>(null);\n\n  const username = user?.username || user?.firstName || 'your-username';\n\n  const { frontmatter, content, errors } = useDebouncedParse(editorContent, 300);\n  const isValid = errors.length === 0 && frontmatter !== null;\n\n  // Load content: clone or blank template\n  useEffect(() => {\n    if (cloneParam) {\n      const slug = cloneParam.includes('/') ? cloneParam.split('/').pop() : cloneParam;\n      if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {\n        setEditorContent(STARTER_TEMPLATE(username));\n        setLoading(false);\n        return;\n      }\n      fetch(`/api/skills/${encodeURIComponent(slug)}/content`)",
    },
  ],
});
