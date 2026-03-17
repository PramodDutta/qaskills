import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing React and Next.js Applications: The Complete 2026 Guide',
  description:
    'Complete guide to testing React and Next.js applications in 2026. Covers unit testing with Vitest, component testing with React Testing Library, E2E with Playwright, server component testing, API route testing, and AI-assisted test generation.',
  date: '2026-03-16',
  category: 'Tutorial',
  content: `
Testing **React** and **Next.js** applications in 2026 is a fundamentally different challenge than it was even two years ago. With **React Server Components (RSC)**, **Server Actions**, the **App Router**, and streaming rendering now standard, the testing landscape has shifted dramatically. This guide walks you through every layer of testing -- from unit tests to full end-to-end flows -- using the modern stack that leading teams rely on today.

## Key Takeaways

- **Vitest + React Testing Library** is the standard unit and component testing stack for React and Next.js in 2026, replacing Jest for most new projects
- **React Server Components** require a new testing mindset -- you cannot render them in jsdom; instead, test their output or use integration-level approaches
- **Server Actions** and **API route handlers** should be tested as plain async functions with mocked dependencies, not through the browser
- **Playwright** remains the gold standard for E2E testing, with first-class support for Next.js streaming, loading states, and parallel execution
- **Mock Service Worker (MSW)** bridges the gap between unit and E2E tests by intercepting network requests at the service worker level
- **AI-assisted test generation** with tools like Claude Code, combined with specialized QA skills from [qaskills.sh](https://qaskills.sh), can accelerate test authoring by 5-10x while maintaining quality

---

## 1. Introduction: The React/Next.js Testing Challenge in 2026

The React ecosystem has undergone a seismic shift. **Next.js 15** and **React 19** introduced patterns that break traditional testing assumptions:

- **React Server Components** run exclusively on the server. They cannot use \`useState\`, \`useEffect\`, or any browser API. Traditional component testing tools like React Testing Library render in jsdom -- a simulated browser environment that cannot execute server-only code.
- **Server Actions** blur the line between client and server. A function defined with \`'use server'\` can be called directly from a client component but executes on the server. Testing these requires understanding both sides.
- **The App Router** uses file-system conventions (\`layout.tsx\`, \`page.tsx\`, \`loading.tsx\`, \`error.tsx\`) that are tightly coupled to Next.js routing internals, making isolated testing harder.
- **Streaming and Suspense** mean that pages no longer render in a single pass. Components can suspend, show fallbacks, and resolve asynchronously.

These changes demand a **layered testing strategy** where each layer addresses specific concerns. Let us build that strategy from the ground up.

---

## 2. The Modern Testing Stack

Here is the testing stack that top React and Next.js teams use in 2026:

| Tool | Role | Why It Wins |
|------|------|-------------|
| **Vitest** | Unit + component test runner | Native ESM, Vite-powered speed, Jest-compatible API |
| **React Testing Library** | Component rendering + assertions | User-centric testing philosophy, accessible queries |
| **Playwright** | End-to-end testing | Cross-browser, auto-waiting, first-class Next.js support |
| **MSW (Mock Service Worker)** | API mocking | Network-level interception, works in tests and dev |
| **@testing-library/user-event** | User interaction simulation | Realistic event dispatching |
| **Storybook** | Component development + visual testing | Isolated component rendering, interaction tests |

Install the core dependencies:

\`\`\`bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
pnpm add -D @vitejs/plugin-react jsdom msw
pnpm add -D playwright @playwright/test
\`\`\`

To give your AI coding agent expert knowledge of this entire stack, install the relevant QA skills:

\`\`\`bash
npx @qaskills/cli add react-testing-library
npx @qaskills/cli add vitest
npx @qaskills/cli add nextjs-testing
\`\`\`

---

## 3. Vitest Configuration for Next.js

A solid Vitest configuration is the foundation. Here is a production-ready setup:

\`\`\`typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/**/index.ts', 'src/app/**/layout.tsx'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 4,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
\`\`\`

\`\`\`typescript
// vitest.setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Automatic cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return \`<img \${Object.entries(props).map(([k, v]) => k + '="' + v + '"').join(' ')} />\`;
  },
}));
\`\`\`

---

## 4. Unit Testing React Components

### Testing a Basic Client Component

Start with the fundamentals. A well-structured component test focuses on **what the user sees and does**, not implementation details:

\`\`\`typescript
// src/components/search-bar.tsx
'use client';

import { useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({ onSearch, placeholder = 'Search...' }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} role="search">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label="Search"
      />
      <button type="submit">Search</button>
    </form>
  );
}
\`\`\`

\`\`\`typescript
// src/components/search-bar.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SearchBar } from './search-bar';

describe('SearchBar', () => {
  it('renders with the default placeholder', () => {
    render(<SearchBar onSearch={vi.fn()} />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders with a custom placeholder', () => {
    render(<SearchBar onSearch={vi.fn()} placeholder="Find skills..." />);
    expect(screen.getByPlaceholderText('Find skills...')).toBeInTheDocument();
  });

  it('calls onSearch with trimmed query on submit', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    await user.type(screen.getByRole('textbox'), '  playwright  ');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(onSearch).toHaveBeenCalledWith('playwright');
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it('does not call onSearch with an empty query', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(onSearch).not.toHaveBeenCalled();
  });
});
\`\`\`

### Testing Custom Hooks

Extract complex logic into **custom hooks** and test them independently:

\`\`\`typescript
// src/hooks/use-debounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
\`\`\`

\`\`\`typescript
// src/hooks/use-debounce.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useDebounce } from './use-debounce';

describe('useDebounce', () => {
  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 500));
    expect(result.current).toBe('hello');
  });

  it('updates the value after the specified delay', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 500 } }
    );

    rerender({ value: 'world', delay: 500 });
    expect(result.current).toBe('hello');

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe('world');
    vi.useRealTimers();
  });
});
\`\`\`

### Testing Context Providers

When components depend on React context, wrap them with the necessary providers:

\`\`\`typescript
// src/test-utils/render.tsx
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from '@/providers/theme-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function AllProviders({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}
\`\`\`

---

## 5. Testing Next.js Server Components

This is where 2026 testing gets interesting. **React Server Components** cannot be tested the traditional way because they run on the server, not in the browser.

### The RSC Testing Challenge

Server components:
- Execute on the server only (no jsdom)
- Can \`await\` async data directly
- Cannot use React hooks (\`useState\`, \`useEffect\`)
- Cannot have event handlers
- Can import server-only modules (database clients, file system)

### Strategy 1: Test the Data Layer Separately

The most practical approach is to **separate data fetching from presentation**:

\`\`\`typescript
// src/lib/skills.ts (data layer)
export async function getSkillBySlug(slug: string) {
  const skill = await db.query.skills.findFirst({
    where: eq(skills.slug, slug),
  });
  if (!skill) throw new Error('Skill not found');
  return skill;
}

export async function getTopSkills(limit = 10) {
  return db.query.skills.findMany({
    orderBy: desc(skills.qualityScore),
    limit,
  });
}
\`\`\`

\`\`\`typescript
// src/lib/skills.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSkillBySlug, getTopSkills } from './skills';

// Mock the database module
vi.mock('@/db', () => ({
  db: {
    query: {
      skills: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
  },
}));

import { db } from '@/db';

describe('getSkillBySlug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the skill when found', async () => {
    const mockSkill = { id: '1', slug: 'playwright-e2e', name: 'Playwright E2E' };
    vi.mocked(db.query.skills.findFirst).mockResolvedValue(mockSkill);

    const result = await getSkillBySlug('playwright-e2e');

    expect(result).toEqual(mockSkill);
  });

  it('throws when skill is not found', async () => {
    vi.mocked(db.query.skills.findFirst).mockResolvedValue(undefined);

    await expect(getSkillBySlug('nonexistent')).rejects.toThrow('Skill not found');
  });
});
\`\`\`

### Strategy 2: Snapshot Test the Server Component Output

For server components that primarily render HTML, you can test the rendered output:

\`\`\`typescript
// src/app/skills/[slug]/page.tsx
import { getSkillBySlug } from '@/lib/skills';
import { SkillDetail } from '@/components/skills/skill-detail';

export default async function SkillPage({ params }: { params: { slug: string } }) {
  const skill = await getSkillBySlug(params.slug);
  return <SkillDetail skill={skill} />;
}
\`\`\`

\`\`\`typescript
// Test the client component that receives the data
// src/components/skills/skill-detail.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SkillDetail } from './skill-detail';

const mockSkill = {
  id: '1',
  name: 'Playwright E2E',
  description: 'Expert Playwright testing patterns',
  slug: 'playwright-e2e',
  version: '1.0.0',
  author: 'QASkills',
  qualityScore: 95,
  installCount: 1200,
  tags: ['playwright', 'e2e', 'testing'],
};

describe('SkillDetail', () => {
  it('renders skill information', () => {
    render(<SkillDetail skill={mockSkill} />);

    expect(screen.getByText('Playwright E2E')).toBeInTheDocument();
    expect(screen.getByText('Expert Playwright testing patterns')).toBeInTheDocument();
  });

  it('displays install count and quality score', () => {
    render(<SkillDetail skill={mockSkill} />);

    expect(screen.getByText(/1,200/)).toBeInTheDocument();
    expect(screen.getByText(/95/)).toBeInTheDocument();
  });
});
\`\`\`

### Strategy 3: Integration Tests with Next.js Test Mode

Next.js 15+ provides experimental test mode support for rendering server components:

\`\`\`typescript
// next.config.ts
const nextConfig = {
  experimental: {
    testMode: true, // Enables server component testing utilities
  },
};
\`\`\`

This allows rendering full page trees in a test environment, including server components with mocked data sources.

---

## 6. Testing Next.js API Routes and Server Actions

### Testing Route Handlers

Next.js App Router **route handlers** are standard Web API Request/Response functions. Test them like any async function:

\`\`\`typescript
// src/app/api/skills/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { skills } from '@/db/schema';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const results = await db.select().from(skills).limit(limit).offset(offset);

  return NextResponse.json({ skills: results, page, limit });
}
\`\`\`

\`\`\`typescript
// src/app/api/skills/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue([
      { id: '1', name: 'Playwright E2E', slug: 'playwright-e2e' },
    ]),
  },
}));

describe('GET /api/skills', () => {
  it('returns paginated skills', async () => {
    const request = new NextRequest('http://localhost:3000/api/skills?page=1&limit=10');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.skills).toHaveLength(1);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(10);
  });

  it('defaults to page 1 with limit 20', async () => {
    const request = new NextRequest('http://localhost:3000/api/skills');
    const response = await GET(request);
    const data = await response.json();

    expect(data.page).toBe(1);
    expect(data.limit).toBe(20);
  });
});
\`\`\`

### Testing Server Actions

**Server Actions** are async functions that execute on the server. Test them by mocking their dependencies:

\`\`\`typescript
// src/app/actions/publish-skill.ts
'use server';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { skills } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { skillCreateSchema } from '@qaskills/shared';

export async function publishSkill(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    return { error: 'Authentication required' };
  }

  const rawData = Object.fromEntries(formData);
  const parsed = skillCreateSchema.safeParse(rawData);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const [newSkill] = await db.insert(skills).values({
    ...parsed.data,
    authorId: userId,
  }).returning();

  revalidatePath('/skills');
  return { success: true, skill: newSkill };
}
\`\`\`

\`\`\`typescript
// src/app/actions/publish-skill.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { publishSkill } from './publish-skill';

describe('publishSkill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);

    const formData = new FormData();
    const result = await publishSkill(formData);

    expect(result).toEqual({ error: 'Authentication required' });
  });

  it('validates input data', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never);

    const formData = new FormData();
    formData.set('name', ''); // Invalid: empty name
    const result = await publishSkill(formData);

    expect(result.error).toBeDefined();
  });
});
\`\`\`

### Testing Middleware

\`\`\`typescript
// src/middleware.test.ts
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Test middleware logic in isolation
function isProtectedRoute(pathname: string): boolean {
  const protectedPatterns = ['/dashboard', '/api/skills/create', '/api/reviews'];
  return protectedPatterns.some((pattern) => pathname.startsWith(pattern));
}

describe('Route Protection', () => {
  it('identifies protected routes', () => {
    expect(isProtectedRoute('/dashboard')).toBe(true);
    expect(isProtectedRoute('/dashboard/settings')).toBe(true);
    expect(isProtectedRoute('/api/skills/create')).toBe(true);
    expect(isProtectedRoute('/api/reviews')).toBe(true);
  });

  it('allows public routes', () => {
    expect(isProtectedRoute('/')).toBe(false);
    expect(isProtectedRoute('/skills')).toBe(false);
    expect(isProtectedRoute('/api/webhooks/clerk')).toBe(false);
    expect(isProtectedRoute('/blog')).toBe(false);
  });
});
\`\`\`

---

## 7. Integration Testing with Mock Service Worker (MSW)

**MSW** intercepts HTTP requests at the network level, making it ideal for testing components that fetch data without changing your application code.

### Setting Up MSW

\`\`\`typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/skills', ({ request }) => {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');

    const allSkills = [
      { id: '1', name: 'Playwright E2E', slug: 'playwright-e2e', category: 'e2e' },
      { id: '2', name: 'Vitest Unit', slug: 'vitest-unit', category: 'unit' },
      { id: '3', name: 'React Testing Library', slug: 'react-testing-library', category: 'unit' },
    ];

    const filtered = category
      ? allSkills.filter((s) => s.category === category)
      : allSkills;

    return HttpResponse.json({ skills: filtered });
  }),

  http.post('/api/skills', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      { success: true, skill: { id: '4', ...body } },
      { status: 201 }
    );
  }),

  http.get('/api/skills/:slug', ({ params }) => {
    return HttpResponse.json({
      id: '1',
      name: 'Playwright E2E',
      slug: params.slug,
      description: 'Expert Playwright testing patterns for AI agents',
    });
  }),
];
\`\`\`

\`\`\`typescript
// src/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
\`\`\`

\`\`\`typescript
// vitest.setup.ts (add MSW setup)
import { server } from './src/mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
\`\`\`

### Testing Data Fetching Components

\`\`\`typescript
// src/components/skills/skills-list.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { SkillsList } from './skills-list';
import { renderWithProviders } from '@/test-utils/render';

describe('SkillsList', () => {
  it('renders skills from the API', async () => {
    renderWithProviders(<SkillsList />);

    await waitFor(() => {
      expect(screen.getByText('Playwright E2E')).toBeInTheDocument();
      expect(screen.getByText('Vitest Unit')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    server.use(
      http.get('/api/skills', () => {
        return HttpResponse.json(
          { error: 'Internal Server Error' },
          { status: 500 }
        );
      })
    );

    renderWithProviders(<SkillsList />);

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it('filters skills by category', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SkillsList />);

    await waitFor(() => {
      expect(screen.getByText('Playwright E2E')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /unit/i }));

    await waitFor(() => {
      expect(screen.queryByText('Playwright E2E')).not.toBeInTheDocument();
      expect(screen.getByText('Vitest Unit')).toBeInTheDocument();
    });
  });
});
\`\`\`

---

## 8. E2E Testing with Playwright

**Playwright** is the definitive E2E testing tool for Next.js applications in 2026. It handles streaming, hydration, and authentication out of the box.

### Playwright Configuration for Next.js

\`\`\`typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
  ],
  webServer: {
    command: 'pnpm next dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
\`\`\`

Install the Playwright QA skill for best practices:

\`\`\`bash
npx @qaskills/cli add playwright-e2e
\`\`\`

### Testing Full User Flows

\`\`\`typescript
// e2e/skill-discovery.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Skill Discovery Flow', () => {
  test('user can search and view a skill', async ({ page }) => {
    await page.goto('/skills');

    // Wait for skills to load (handles streaming/suspense)
    await expect(page.getByRole('heading', { name: /browse skills/i })).toBeVisible();

    // Search for a skill
    await page.getByRole('textbox', { name: /search/i }).fill('playwright');
    await page.getByRole('textbox', { name: /search/i }).press('Enter');

    // Verify filtered results
    await expect(page.getByText('Playwright E2E')).toBeVisible();

    // Click to view skill detail
    await page.getByText('Playwright E2E').click();

    // Verify skill detail page
    await expect(page).toHaveURL(/\\/skills\\/playwright-e2e/);
    await expect(page.getByRole('heading', { name: 'Playwright E2E' })).toBeVisible();
  });

  test('skill install command is visible', async ({ page }) => {
    await page.goto('/skills/playwright-e2e');

    const installCommand = page.getByText('npx @qaskills/cli add playwright-e2e');
    await expect(installCommand).toBeVisible();
  });
});
\`\`\`

### Authentication in E2E Tests

\`\`\`typescript
// e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: /continue/i }).click();

  // Wait for redirect after login
  await page.waitForURL('/dashboard');
  await expect(page.getByText(/welcome/i)).toBeVisible();

  // Save auth state
  await page.context().storageState({ path: authFile });
});
\`\`\`

### Visual Regression Testing

\`\`\`typescript
// e2e/visual-regression.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('homepage matches snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('homepage.png', {
      maxDiffPixels: 100,
      fullPage: true,
    });
  });

  test('skill card component is consistent', async ({ page }) => {
    await page.goto('/skills');
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('[data-testid="skill-card"]').first();
    await expect(firstCard).toHaveScreenshot('skill-card.png');
  });
});
\`\`\`

---

## 9. Component Testing Strategies

### Storybook + Testing

**Storybook** provides isolated component rendering that pairs perfectly with interaction testing:

\`\`\`typescript
// src/components/skills/skill-card.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { SkillCard } from './skill-card';

const meta: Meta<typeof SkillCard> = {
  component: SkillCard,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SkillCard>;

export const Default: Story = {
  args: {
    skill: {
      name: 'Playwright E2E',
      slug: 'playwright-e2e',
      description: 'Expert Playwright testing patterns',
      installCount: 1200,
      qualityScore: 95,
    },
  },
};

export const WithInteraction: Story = {
  ...Default,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify content renders
    await expect(canvas.getByText('Playwright E2E')).toBeInTheDocument();

    // Test hover state
    const card = canvas.getByRole('article');
    await userEvent.hover(card);

    // Verify install button appears on hover
    await expect(canvas.getByRole('button', { name: /install/i })).toBeVisible();
  },
};
\`\`\`

### Snapshot Testing with Vitest

Use snapshots sparingly -- they are best for catching **unintentional** changes to rendered output:

\`\`\`typescript
// src/components/ui/badge.test.tsx
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from './badge';

describe('Badge', () => {
  it('matches snapshot for each variant', () => {
    const variants = ['default', 'secondary', 'destructive', 'outline'] as const;

    variants.forEach((variant) => {
      const { container } = render(
        <Badge variant={variant}>Test Badge</Badge>
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
\`\`\`

---

## 10. Testing Patterns for Common Scenarios

### Testing Forms

\`\`\`typescript
// src/components/forms/skill-form.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SkillForm } from './skill-form';

describe('SkillForm', () => {
  it('shows validation errors for required fields', async () => {
    const user = userEvent.setup();
    render(<SkillForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /publish/i }));

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/description is required/i)).toBeInTheDocument();
    });
  });

  it('submits valid form data', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SkillForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/name/i), 'My Testing Skill');
    await user.type(screen.getByLabelText(/description/i), 'A comprehensive testing skill for React applications');
    await user.selectOptions(screen.getByLabelText(/category/i), 'unit');
    await user.click(screen.getByRole('button', { name: /publish/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Testing Skill',
          description: 'A comprehensive testing skill for React applications',
        })
      );
    });
  });
});
\`\`\`

### Testing Error Boundaries

\`\`\`typescript
// src/components/error-boundary.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorBoundary } from './error-boundary';

const ThrowingComponent = () => {
  throw new Error('Test error');
};

describe('ErrorBoundary', () => {
  // Suppress console.error for expected errors
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('renders fallback UI when child throws', () => {
    render(
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <div>Working content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Working content')).toBeInTheDocument();
  });
});
\`\`\`

### Testing Loading States

\`\`\`typescript
// src/components/skills/skills-grid.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { http, HttpResponse, delay } from 'msw';
import { server } from '@/mocks/server';
import { SkillsGrid } from './skills-grid';
import { renderWithProviders } from '@/test-utils/render';

describe('SkillsGrid', () => {
  it('shows loading skeleton while fetching', async () => {
    server.use(
      http.get('/api/skills', async () => {
        await delay(1000);
        return HttpResponse.json({ skills: [] });
      })
    );

    renderWithProviders(<SkillsGrid />);

    // Loading skeletons should be visible
    expect(screen.getAllByTestId('skill-skeleton')).toHaveLength(6);

    // Wait for content to load
    await waitFor(() => {
      expect(screen.queryByTestId('skill-skeleton')).not.toBeInTheDocument();
    });
  });
});
\`\`\`

### Testing Data Fetching with Error Recovery

\`\`\`typescript
describe('SkillsGrid error handling', () => {
  it('shows retry button on fetch failure', async () => {
    const user = userEvent.setup();

    server.use(
      http.get('/api/skills', () => {
        return HttpResponse.json({ error: 'Server error' }, { status: 500 });
      })
    );

    renderWithProviders(<SkillsGrid />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });

    // Reset to working handler
    server.resetHandlers();

    await user.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText('Playwright E2E')).toBeInTheDocument();
    });
  });
});
\`\`\`

---

## 11. AI-Assisted Test Generation

One of the most powerful accelerators for test writing in 2026 is combining **AI coding agents** with **specialized QA skills**. Tools like **Claude Code**, **Cursor**, and **GitHub Copilot** can generate tests, but their output quality improves dramatically when they have access to framework-specific testing knowledge.

### Installing QA Skills for React and Next.js Testing

The [QASkills.sh](https://qaskills.sh) directory provides curated testing skills that you can install into any AI coding agent:

\`\`\`bash
# Install React Testing Library expertise
npx @qaskills/cli add react-testing-library

# Install Next.js-specific testing patterns
npx @qaskills/cli add nextjs-testing

# Install Vitest configuration and patterns
npx @qaskills/cli add vitest

# Install Playwright E2E patterns
npx @qaskills/cli add playwright-e2e

# Browse all available skills
npx @qaskills/cli search --category testing
\`\`\`

Once installed, your AI agent gains deep knowledge of:

- **Correct testing patterns**: User-centric queries over implementation details
- **Framework idioms**: Proper use of \`act()\`, \`waitFor()\`, \`findBy*\` queries
- **Anti-patterns to avoid**: Testing implementation details, snapshot overuse, brittle selectors
- **Next.js specifics**: How to mock \`next/navigation\`, test server components, handle RSC boundaries

### Example: AI-Generated Test with QA Skills

After installing the \`react-testing-library\` skill, ask your AI agent:

> "Write tests for the SkillCard component that verify rendering, click behavior, and accessibility"

The agent produces tests that follow **React Testing Library best practices** -- using \`getByRole\` over \`getByTestId\`, testing user-visible behavior, and avoiding implementation coupling:

\`\`\`typescript
// AI-generated with react-testing-library skill installed
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { SkillCard } from './skill-card';

expect.extend(toHaveNoViolations);

describe('SkillCard', () => {
  const defaultProps = {
    name: 'Playwright E2E',
    slug: 'playwright-e2e',
    description: 'Expert testing patterns',
    installCount: 500,
  };

  it('is accessible', async () => {
    const { container } = render(<SkillCard {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('navigates to skill detail on click', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<SkillCard {...defaultProps} onNavigate={onNavigate} />);

    await user.click(screen.getByRole('article'));
    expect(onNavigate).toHaveBeenCalledWith('/skills/playwright-e2e');
  });
});
\`\`\`

Without the QA skill installed, the same AI agent often produces tests that rely on \`getByTestId\`, test CSS classes directly, or use \`container.querySelector\` -- all anti-patterns.

---

## 12. CI/CD Integration

### GitHub Actions for React/Next.js Testing

\`\`\`yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm test -- --coverage

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm exec playwright install --with-deps chromium

      - run: pnpm exec playwright test --project=chromium
        env:
          DATABASE_URL: \${{ secrets.DATABASE_URL }}

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm tsc --noEmit
\`\`\`

### Parallel Test Execution

Split Playwright tests across shards for faster CI:

\`\`\`yaml
  e2e-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1/4, 2/4, 3/4, 4/4]
    steps:
      # ... setup steps ...
      - run: pnpm exec playwright test --shard=\${{ matrix.shard }}
\`\`\`

### Coverage Thresholds

Enforce minimum coverage in your CI pipeline:

\`\`\`typescript
// vitest.config.ts
coverage: {
  thresholds: {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80,
  },
},
\`\`\`

---

## 13. Best Practices

Here are ten **best practices** that the most effective React and Next.js testing teams follow in 2026:

1. **Test behavior, not implementation.** Query by role, label, and text -- never by CSS class or component internals. If a refactor does not change user behavior, tests should not break.

2. **Use the testing trophy, not the pyramid.** For React apps, **integration tests** (component + context + API mocks) deliver the most value. Heavy unit testing of individual functions has diminishing returns.

3. **Separate data from presentation.** Extract data-fetching logic into testable functions. Test server components by testing their data layer and their client component output independently.

4. **Mock at the network boundary.** Use MSW to intercept HTTP requests rather than mocking \`fetch\` directly. This tests more of your actual code path.

5. **Treat test code as production code.** Apply the same standards: no duplication, clear naming, helper functions, shared fixtures, and code review.

6. **Use \`userEvent\` over \`fireEvent\`.** The \`userEvent\` library simulates real user interactions (typing, clicking, tabbing) more accurately than \`fireEvent\`, catching bugs that \`fireEvent\` misses.

7. **Test accessibility from day one.** Include \`jest-axe\` checks in component tests. Every component should be keyboard-navigable and screen-reader compatible.

8. **Run E2E tests on realistic data.** Seed your test database with representative data, not minimal stubs. This catches issues with pagination, empty states, and edge cases.

9. **Keep E2E tests focused.** Each E2E test should verify one user journey. Do not chain unrelated assertions into a single test -- when it fails, you should know exactly what broke.

10. **Install QA skills for your AI agent.** If you use an AI coding agent, give it specialized testing knowledge. Run \`npx @qaskills/cli add react-testing-library\` and \`npx @qaskills/cli add vitest\` to see immediate improvements in generated test quality.

---

## 14. Anti-Patterns to Avoid

Avoid these common **testing anti-patterns** that plague React and Next.js projects:

1. **Testing implementation details.** Asserting on component state, internal method calls, or CSS class names makes tests brittle and resistant to refactoring. Test what the user sees.

2. **Over-relying on snapshot tests.** Snapshots catch unintentional changes but generate noise when components evolve intentionally. Use them for stable UI primitives, not for pages or complex components.

3. **Mocking everything.** If you mock every dependency, you are testing your mocks, not your code. Mock at boundaries (network, database, third-party services) and let internal modules run naturally.

4. **Not waiting for async operations.** Using \`waitFor\` incorrectly (or not at all) leads to flaky tests. Always use \`findBy*\` queries or explicit \`waitFor\` blocks for async content.

5. **Writing E2E tests for everything.** E2E tests are slow and expensive. Reserve them for critical user journeys. Use component-level integration tests for feature coverage.

6. **Ignoring test isolation.** Tests that depend on execution order or shared mutable state will eventually fail in unpredictable ways. Use \`beforeEach\` to reset state, and ensure each test can run independently.

7. **Skipping error path testing.** Most bugs live in error handling code. Test API failures, validation errors, timeout scenarios, and unexpected data shapes.

8. **Not testing loading states.** Users spend real time looking at loading states. Test that skeletons, spinners, and progress indicators appear correctly, and that they disappear when data arrives.

---

## Conclusion

Testing React and Next.js applications in 2026 requires a multi-layered approach. **Vitest** and **React Testing Library** handle the component and integration layers. **Playwright** covers end-to-end user flows. **MSW** bridges the gap with realistic network mocking. And **AI coding agents** equipped with specialized QA skills from [qaskills.sh](https://qaskills.sh) accelerate the entire process.

The key insight is that **React Server Components have not made testing harder -- they have made testing boundaries clearer**. Server logic, client interactivity, and full user journeys each have their own testing layer with appropriate tools.

Start by installing the testing skills your AI agent needs:

\`\`\`bash
npx @qaskills/cli add react-testing-library
npx @qaskills/cli add nextjs-testing
npx @qaskills/cli add vitest
npx @qaskills/cli add playwright-e2e
\`\`\`

Then build your test suite layer by layer, starting with the data layer and working up to E2E flows. Your future self -- and your team -- will thank you.

Browse 300+ QA skills at [qaskills.sh/skills](https://qaskills.sh/skills).
`,
};
