import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 884,
  slug: 'requirements-coverage-traceability-audit',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Requirements Coverage Traceability Audit',
  description:
    'Requirements coverage traceability audit: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'Requirements coverage traceability audit',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify Requirements coverage traceability audit, specifically bidirectional requirement-to-test and test-to-requirement links?',
  intentBoundary:
    'Owns bidirectional requirement-to-test and test-to-requirement links. It excludes generic KPI catalogs, observability infrastructure, or vendor dashboards, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'Requirements coverage traceability audit example',
    'Requirements coverage traceability audit test cases',
    'Requirements coverage traceability audit failure modes',
    'how to verify requirements coverage traceability audit',
    'QA metrics and process bidirectional requirement-to-test and test-to-requirement links',
    'Requirements coverage traceability audit best practices',
  ],
  repoEvidence: [
    'seed-skills/jira-qa-workflows/SKILL.md',
    'seed-skills/risk-based-testing/SKILL.md',
    'packages/web/src/app/blog/posts/qa-metrics-kpis-dashboard-guide.ts',
    'docs/product/SKILLS-GAP-RESEARCH-2026-07.md',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories',
    '/blog/qa-metrics-kpis-dashboard-guide',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
    '/blog/regression-testing-strategies-guide',
  ],
  relatedSlugs: [
    'qa-metrics-kpis-dashboard-guide',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
    'regression-testing-strategies-guide',
  ],
  sources: [
    'https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/',
    'https://istqb.org/certifications/certified-tester-advanced-level-test-management-ctal-tm-v3-0/',
    'https://www.istqb.org/wp-content/uploads/2024/11/ISTQB_CTAL-TM_Syllabus_v3.0_zKjKsaN.pdf',
  ],
  codeExamples: [
    {
      title: 'Build the Requirements coverage traceability audit baseline',
      language: 'text',
      path: 'seed-skills/jira-qa-workflows/SKILL.md',
      snippet:
        'Summary: [Checkout] Payment fails with saved Visa card on order > $500\n          (Area) + specific behavior + condition. Searchable, no "doesn\'t work".\n\nEnvironment: prod / staging build 2026.07.1 / browser + OS / test account\nSteps to Reproduce:\n  1. Sign in as user with saved Visa ending 4242\n  2. Add items totaling > $500\n  3. Checkout -> select saved card -> Place order\nExpected: Order confirmation page, payment captured once\nActual: Spinner for 30s, then "Payment failed" toast; card charged (see txn id)\nEvidence: screenshot, HAR file, console errors, video for timing issues\nSeverity vs Priority: severity = impact (S1 data loss ... S4 cosmetic);\n                      priority = fix order (set in triage, not by reporter)\nLinks: blocks / is-blocked-by, duplicate-of, relates-to the story it broke',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/risk-based-testing/SKILL.md',
      snippet: '',
    },
  ],
});
