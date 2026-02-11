import Link from 'next/link';
import { Package, Download, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InstallButton } from '@/components/skills/install-button';
import { formatNumber } from '@/lib/utils';

export const metadata = {
  title: 'Skill Packs',
  description: 'Curated collections of QA skills — install multiple skills at once',
};

const packs = [
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

export default function PacksPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Skill Packs</h1>
        <p className="mt-2 text-muted-foreground">
          Curated collections of QA skills. Install an entire testing toolkit with one command.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {packs.map((pack) => (
          <Card key={pack.slug} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  {pack.featured && <Badge variant="success" className="text-xs">Featured</Badge>}
                </div>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Download className="h-3 w-3" /> {formatNumber(pack.installs)}
                </span>
              </div>
              <CardTitle className="mt-2">{pack.name}</CardTitle>
              <CardDescription>{pack.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  {pack.skillCount} Skills Included
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {pack.skills.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <InstallButton skillSlug={pack.slug} />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
