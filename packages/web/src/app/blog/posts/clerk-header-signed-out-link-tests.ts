import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 389,
  slug: 'clerk-header-signed-out-link-tests',
  campaignCluster: 'web-platform',
  title: 'Clerk Header Signed Out Link Tests',
  description:
    'Clerk header signed out link tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Clerk header signed out link tests',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify Clerk header signed out link in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns Clerk header signed out link as implemented by the cited QASkills files. It excludes broad supported Clerk loading, signed-in, signed-out, and recovery states guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test Clerk header signed out link',
    'Clerk header signed out link edge cases',
    'Clerk header signed out link integration coverage',
    'Clerk header signed out link Playwright assertions',
    'Clerk header signed out link fallback behavior',
    'Clerk header signed out link regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/components/layout/header.tsx',
    'packages/web/src/components/clerk-wrapper.tsx',
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
    'https://clerk.com/docs/reference/nextjs/overview',
    'https://clerk.com/docs/reference/nextjs/clerk-middleware',
    'https://testing-library.com/docs/react-testing-library/intro/',
  ],
  codeExamples: [
    {
      title: 'Build the Clerk header signed out link tests baseline',
      language: 'typescript',
      path: 'packages/web/src/components/layout/header.tsx',
      snippet:
        "export function Header() {\n  const pathname = usePathname();\n  const [mobileOpen, setMobileOpen] = useState(false);\n  const [clerkLoaded, setClerkLoaded] = useState(false);\n  // eslint-disable-next-line @typescript-eslint/no-explicit-any\n  const [ClerkUI, setClerkUI] = useState<Record<string, React.ComponentType<any>> | null>(null);\n\n  useEffect(() => {\n    // Only load Clerk components on the client after mount\n    if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {\n      import('@clerk/nextjs')\n        .then((clerk) => {\n          setClerkUI({\n            SignInButton: clerk.SignInButton,\n            SignedIn: clerk.SignedIn,\n            SignedOut: clerk.SignedOut,\n            UserButton: clerk.UserButton,\n          });",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/components/clerk-wrapper.tsx',
      snippet: '',
    },
  ],
});
