import { db } from '@/db';
import { skills } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { PacksGrid } from '@/components/packs/packs-grid';

// DB-driven page: render per-request (Vercel has DATABASE_URL at runtime;
// CI build has none, so avoid build-time prerender against the DB).
export const dynamic = 'force-dynamic';


export const metadata = {
  title: 'Skill Packs',
  description:
    'Curated bundles of QA testing skills for AI agents. Install an entire Playwright, API, or performance testing toolkit with one command.',
};

const fallbackPacks = [
  {
    name: 'Complete Playwright Suite',
    slug: 'playwright-suite',
    description: 'Everything you need for Playwright testing — E2E, API, visual regression, and accessibility.',
    skills: ['playwright-e2e', 'playwright-api', 'visual-regression', 'axe-accessibility'],
    skillCount: 4,
    installs: 820,
    featured: true,
  },
  {
    name: 'API Testing Toolkit',
    slug: 'api-testing-toolkit',
    description: 'Comprehensive API testing with REST, GraphQL, contract testing, and performance.',
    skills: ['playwright-api', 'rest-assured-api', 'postman-api', 'contract-testing-pact', 'k6-performance'],
    skillCount: 5,
    installs: 560,
    featured: true,
  },
  {
    name: 'Performance & Load Testing',
    slug: 'performance-suite',
    description: 'Load test your applications with k6 and JMeter, plus CI/CD integration.',
    skills: ['k6-performance', 'jmeter-load', 'cicd-pipeline'],
    skillCount: 3,
    installs: 340,
    featured: false,
  },
  {
    name: 'Security & Compliance',
    slug: 'security-compliance',
    description: 'OWASP security testing and accessibility compliance in one pack.',
    skills: ['owasp-security', 'axe-accessibility'],
    skillCount: 2,
    installs: 280,
    featured: false,
  },
  {
    name: 'Unit Testing Essentials',
    slug: 'unit-testing-essentials',
    description: 'Jest and Pytest patterns with test data generation for both JS and Python projects.',
    skills: ['jest-unit', 'pytest-patterns', 'test-data-generation'],
    skillCount: 3,
    installs: 450,
    featured: true,
  },
  {
    name: 'QA Process Pack',
    slug: 'qa-process',
    description: 'Test planning, bug reporting, BDD patterns, and CI/CD configuration.',
    skills: ['test-plan-generation', 'bug-report-writing', 'bdd-cucumber', 'cicd-pipeline'],
    skillCount: 4,
    installs: 210,
    featured: false,
  },
];

interface PackQuery {
  name: string;
  slug: string;
  description: string;
  featured: boolean;
  query: ReturnType<typeof sql>;
  limit?: number;
}

const packQueries: PackQuery[] = [
  {
    name: 'Complete Playwright Suite',
    slug: 'playwright-suite',
    description: 'Everything you need for Playwright testing — E2E, API, visual regression, and accessibility.',
    featured: true,
    query: sql`${skills.frameworks} @> ${JSON.stringify(['playwright'])}::jsonb`,
  },
  {
    name: 'API Testing Toolkit',
    slug: 'api-testing-toolkit',
    description: 'Comprehensive API testing with REST, GraphQL, contract testing, and performance.',
    featured: true,
    query: sql`${skills.testingTypes} @> ${JSON.stringify(['api'])}::jsonb`,
  },
  {
    name: 'Performance & Load Testing',
    slug: 'performance-suite',
    description: 'Load test your applications with k6 and JMeter, plus CI/CD integration.',
    featured: false,
    query: sql`${skills.testingTypes} @> ${JSON.stringify(['performance'])}::jsonb OR ${skills.testingTypes} @> ${JSON.stringify(['load'])}::jsonb`,
  },
  {
    name: 'Security & Compliance',
    slug: 'security-compliance',
    description: 'OWASP security testing and accessibility compliance in one pack.',
    featured: false,
    query: sql`${skills.testingTypes} @> ${JSON.stringify(['security'])}::jsonb`,
  },
  {
    name: 'Mobile Testing Kit',
    slug: 'mobile-testing-kit',
    description: 'Mobile app testing automation for iOS and Android with Appium and cross-platform tools.',
    featured: false,
    query: sql`${skills.domains} @> ${JSON.stringify(['mobile'])}::jsonb`,
  },
  {
    name: 'Full Stack QA',
    slug: 'full-stack-qa',
    description: 'A curated mix of the best featured QA skills across all testing types.',
    featured: true,
    query: sql`${skills.featured} = true`,
    limit: 8,
  },
];

async function getPacksFromDb() {
  const enrichedPacks = await Promise.all(
    packQueries.map(async (pack) => {
      const matchedSkills = await db
        .select({
          slug: skills.slug,
          name: skills.name,
          installCount: skills.installCount,
        })
        .from(skills)
        .where(pack.query)
        .limit(pack.limit ?? 20);

      const skillSlugs = matchedSkills.map((s) => s.slug);
      const totalInstalls = matchedSkills.reduce((sum, s) => sum + s.installCount, 0);

      return {
        name: pack.name,
        slug: pack.slug,
        description: pack.description,
        skills: skillSlugs,
        skillCount: skillSlugs.length,
        installs: totalInstalls,
        featured: pack.featured,
      };
    }),
  );

  return enrichedPacks;
}

export default async function PacksPage() {
  let packs = fallbackPacks;

  try {
    const dbPacks = await getPacksFromDb();
    // Only use DB packs if we actually got results
    if (dbPacks.some((p) => p.skillCount > 0)) {
      packs = dbPacks;
    }
  } catch (error) {
    console.error('Failed to fetch packs from DB, using fallback:', error);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Skill Packs</h1>
        <p className="mt-2 text-muted-foreground">
          Curated collections of QA skills. Install an entire testing toolkit with one command.
        </p>
      </div>

      <PacksGrid packs={packs} />
    </div>
  );
}
