import { Suspense } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SkillCard } from '@/components/skills/skill-card';
import { FilterPanel } from '@/components/skills/filter-panel';
import { Badge } from '@/components/ui/badge';
import type { SkillSummary } from '@qaskills/shared';
import { db } from '@/db';
import { skills } from '@/db/schema';
import { desc, ilike, sql, and, or, type SQL } from 'drizzle-orm';

export const metadata = {
  title: 'Browse QA Skills',
  description: 'Search and install curated QA testing skills for AI coding agents',
};

interface SkillsPageProps {
  searchParams: Promise<{
    q?: string;
    testingType?: string | string[];
    framework?: string | string[];
    language?: string | string[];
    domain?: string | string[];
    agent?: string | string[];
    sort?: string;
    page?: string;
  }>;
}

function toArray(val: string | string[] | undefined): string[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

interface SkillsResult {
  skills: SkillSummary[];
  total: number;
  page: number;
  totalPages: number;
}

async function getSkills(searchParams: Awaited<SkillsPageProps['searchParams']>): Promise<SkillsResult> {
  const query = searchParams.q || '';
  const sort = searchParams.sort || 'trending';
  const page = Math.max(1, parseInt(searchParams.page || '1', 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  const testingTypes = toArray(searchParams.testingType);
  const frameworks = toArray(searchParams.framework);
  const languages = toArray(searchParams.language);
  const domains = toArray(searchParams.domain);
  const agents = toArray(searchParams.agent);

  try {
    // Build conditions array
    const conditions: SQL[] = [];

    // Text search on name and description
    if (query) {
      conditions.push(
        or(
          ilike(skills.name, `%${query}%`),
          ilike(skills.description, `%${query}%`),
        )!,
      );
    }

    // JSONB array filters using @> (contains) operator
    if (testingTypes.length > 0) {
      const typeConditions = testingTypes.map(
        (t) => sql`${skills.testingTypes} @> ${JSON.stringify([t])}::jsonb`,
      );
      conditions.push(or(...typeConditions)!);
    }

    if (frameworks.length > 0) {
      const fwConditions = frameworks.map(
        (f) => sql`${skills.frameworks} @> ${JSON.stringify([f])}::jsonb`,
      );
      conditions.push(or(...fwConditions)!);
    }

    if (languages.length > 0) {
      const langConditions = languages.map(
        (l) => sql`${skills.languages} @> ${JSON.stringify([l])}::jsonb`,
      );
      conditions.push(or(...langConditions)!);
    }

    if (domains.length > 0) {
      const domainConditions = domains.map(
        (d) => sql`${skills.domains} @> ${JSON.stringify([d])}::jsonb`,
      );
      conditions.push(or(...domainConditions)!);
    }

    if (agents.length > 0) {
      const agentConditions = agents.map(
        (a) => sql`${skills.agents} @> ${JSON.stringify([a])}::jsonb`,
      );
      conditions.push(or(...agentConditions)!);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Sort order
    let orderBy;
    switch (sort) {
      case 'newest':
        orderBy = desc(skills.createdAt);
        break;
      case 'highest_quality':
        orderBy = desc(skills.qualityScore);
        break;
      case 'most_installed':
        orderBy = desc(skills.installCount);
        break;
      case 'trending':
      default:
        orderBy = desc(skills.weeklyInstalls);
        break;
    }

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(skills)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(skills)
        .where(whereClause),
    ]);

    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);

    return {
      skills: rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        author: row.authorName,
        qualityScore: row.qualityScore,
        installCount: row.installCount,
        testingTypes: row.testingTypes,
        frameworks: row.frameworks,
        featured: row.featured,
        verified: row.verified,
      })),
      total,
      page,
      totalPages,
    };
  } catch {
    // Fallback: return seed skills data when DB is not connected
    const fallback = getSeedSkills();
    let filtered = fallback;

    // Apply client-side filtering on fallback data
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(
        (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
      );
    }
    if (testingTypes.length > 0) {
      filtered = filtered.filter((s) =>
        testingTypes.some((t) => s.testingTypes.includes(t)),
      );
    }
    if (frameworks.length > 0) {
      filtered = filtered.filter((s) =>
        frameworks.some((f) => s.frameworks.includes(f)),
      );
    }

    return {
      skills: filtered,
      total: filtered.length,
      page: 1,
      totalPages: 1,
    };
  }
}

function getSeedSkills(): SkillSummary[] {
  return [
    { id: '1', name: 'Playwright E2E Testing', slug: 'playwright-e2e', description: 'Comprehensive Playwright end-to-end testing patterns with Page Object Model, fixtures, and best practices', author: 'thetestingacademy', qualityScore: 92, installCount: 1250, testingTypes: ['e2e', 'visual'], frameworks: ['playwright'], featured: true, verified: true },
    { id: '2', name: 'Playwright API Testing', slug: 'playwright-api', description: 'API testing with Playwright APIRequestContext for REST and GraphQL endpoints', author: 'thetestingacademy', qualityScore: 88, installCount: 890, testingTypes: ['api'], frameworks: ['playwright'], featured: false, verified: true },
    { id: '3', name: 'Cypress E2E Testing', slug: 'cypress-e2e', description: 'Cypress end-to-end testing with custom commands, intercepts, and component testing', author: 'thetestingacademy', qualityScore: 90, installCount: 1100, testingTypes: ['e2e'], frameworks: ['cypress'], featured: true, verified: true },
    { id: '4', name: 'Selenium Java Testing', slug: 'selenium-java', description: 'Selenium WebDriver with Java using Page Object Model and TestNG', author: 'thetestingacademy', qualityScore: 85, installCount: 720, testingTypes: ['e2e'], frameworks: ['selenium'], featured: false, verified: true },
    { id: '5', name: 'k6 Performance Testing', slug: 'k6-performance', description: 'Modern load testing with k6 including thresholds, scenarios, and custom metrics', author: 'thetestingacademy', qualityScore: 87, installCount: 650, testingTypes: ['performance', 'load'], frameworks: ['k6'], featured: true, verified: true },
    { id: '6', name: 'JMeter Load Testing', slug: 'jmeter-load', description: 'Apache JMeter load testing with thread groups, assertions, and distributed testing', author: 'thetestingacademy', qualityScore: 82, installCount: 480, testingTypes: ['load', 'performance'], frameworks: ['jmeter'], featured: false, verified: true },
    { id: '7', name: 'OWASP Security Testing', slug: 'owasp-security', description: 'OWASP Top 10 security testing patterns and vulnerability scanning', author: 'thetestingacademy', qualityScore: 89, installCount: 560, testingTypes: ['security'], frameworks: [], featured: true, verified: true },
    { id: '8', name: 'Appium Mobile Testing', slug: 'appium-mobile', description: 'Mobile app testing automation for iOS and Android with Appium', author: 'thetestingacademy', qualityScore: 84, installCount: 390, testingTypes: ['mobile', 'e2e'], frameworks: ['appium'], featured: false, verified: true },
    { id: '9', name: 'Axe-core Accessibility', slug: 'axe-accessibility', description: 'Automated accessibility testing with axe-core and WCAG 2.1 compliance', author: 'thetestingacademy', qualityScore: 86, installCount: 420, testingTypes: ['accessibility'], frameworks: ['axe-core'], featured: false, verified: true },
    { id: '10', name: 'Test Data Generation', slug: 'test-data-generation', description: 'Test data strategies using Faker.js, factories, builders, and database seeding', author: 'thetestingacademy', qualityScore: 83, installCount: 510, testingTypes: ['unit', 'integration', 'e2e'], frameworks: [], featured: false, verified: true },
    { id: '11', name: 'REST Assured API Testing', slug: 'rest-assured-api', description: 'Java REST API testing with REST Assured including JSON schema validation', author: 'thetestingacademy', qualityScore: 85, installCount: 440, testingTypes: ['api'], frameworks: ['rest-assured'], featured: false, verified: true },
    { id: '12', name: 'Jest Unit Testing', slug: 'jest-unit', description: 'Jest unit testing patterns with mocking, spies, snapshots, and async testing', author: 'thetestingacademy', qualityScore: 91, installCount: 980, testingTypes: ['unit'], frameworks: ['jest'], featured: true, verified: true },
    { id: '13', name: 'Pytest Patterns', slug: 'pytest-patterns', description: 'Python testing with pytest fixtures, parametrize, markers, and plugins', author: 'thetestingacademy', qualityScore: 88, installCount: 720, testingTypes: ['unit', 'integration'], frameworks: ['pytest'], featured: false, verified: true },
    { id: '14', name: 'Postman API Testing', slug: 'postman-api', description: 'Postman collections, environments, pre-request scripts, and Newman CI', author: 'thetestingacademy', qualityScore: 84, installCount: 530, testingTypes: ['api'], frameworks: ['postman'], featured: false, verified: true },
    { id: '15', name: 'BDD/Cucumber Patterns', slug: 'bdd-cucumber', description: 'Behavior-driven development with Cucumber, Gherkin, and step definitions', author: 'thetestingacademy', qualityScore: 82, installCount: 380, testingTypes: ['bdd', 'e2e'], frameworks: ['cucumber'], featured: false, verified: true },
    { id: '16', name: 'Test Plan Generation', slug: 'test-plan-generation', description: 'Generate comprehensive test plans with coverage matrices and risk-based testing', author: 'thetestingacademy', qualityScore: 80, installCount: 340, testingTypes: ['e2e', 'integration', 'unit'], frameworks: [], featured: false, verified: true },
    { id: '17', name: 'Bug Report Writing', slug: 'bug-report-writing', description: 'Write clear bug reports with reproduction steps and severity classification', author: 'thetestingacademy', qualityScore: 78, installCount: 290, testingTypes: [], frameworks: [], featured: false, verified: true },
    { id: '18', name: 'CI/CD Pipeline Config', slug: 'cicd-pipeline', description: 'Configure testing in CI/CD pipelines for GitHub Actions, Jenkins, and GitLab CI', author: 'thetestingacademy', qualityScore: 85, installCount: 610, testingTypes: ['integration'], frameworks: [], featured: false, verified: true },
    { id: '19', name: 'Visual Regression Testing', slug: 'visual-regression', description: 'Visual regression testing with Playwright screenshots and diff comparison', author: 'thetestingacademy', qualityScore: 86, installCount: 430, testingTypes: ['visual', 'e2e'], frameworks: ['playwright'], featured: false, verified: true },
    { id: '20', name: 'Contract Testing (Pact)', slug: 'contract-testing-pact', description: 'Consumer-driven contract testing with Pact and Pact Broker', author: 'thetestingacademy', qualityScore: 84, installCount: 310, testingTypes: ['contract', 'api'], frameworks: ['pact'], featured: false, verified: true },
  ];
}

export default async function SkillsPage({ searchParams }: SkillsPageProps) {
  const params = await searchParams;
  const result = await getSkills(params);

  const sortOptions = [
    { value: 'trending', label: 'Trending' },
    { value: 'most_installed', label: 'Most Installed' },
    { value: 'newest', label: 'Newest' },
    { value: 'highest_quality', label: 'Highest Quality' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Browse QA Skills</h1>
        <p className="mt-2 text-muted-foreground">
          {result.total} skills available for 27+ AI coding agents
        </p>
      </div>

      {/* Search and sort bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <form className="relative flex-1" action="/skills" method="GET">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            placeholder="Search skills..."
            defaultValue={params.q}
            className="pl-10"
          />
        </form>
        <div className="flex gap-2">
          {sortOptions.map((opt) => (
            <Badge
              key={opt.value}
              variant={params.sort === opt.value || (!params.sort && opt.value === 'trending') ? 'default' : 'outline'}
              className="cursor-pointer"
            >
              {opt.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex gap-8">
        {/* Filter sidebar */}
        <div className="hidden lg:block w-64 shrink-0">
          <Suspense fallback={<div>Loading filters...</div>}>
            <FilterPanel />
          </Suspense>
        </div>

        {/* Skills grid */}
        <div className="flex-1">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.skills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>

          {result.skills.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-lg text-muted-foreground">No skills found</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try a different search query or remove some filters
              </p>
            </div>
          )}

          {/* Pagination */}
          {result.totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => (
                <Badge
                  key={p}
                  variant={p === result.page ? 'default' : 'outline'}
                  className="cursor-pointer"
                >
                  {p}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
