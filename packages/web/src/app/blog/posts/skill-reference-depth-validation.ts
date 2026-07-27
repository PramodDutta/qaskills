import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 894,
  slug: 'skill-reference-depth-validation',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Skill Reference Depth Validation',
  description:
    'Skill reference depth validation: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Skill reference depth validation',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify Skill reference depth validation, specifically bounded reference chains with reachable supporting files?',
  intentBoundary:
    'Owns bounded reference chains with reachable supporting files. It excludes basic SKILL.md schema fields, AI model evaluation, or agent runtime infrastructure, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'Skill reference depth validation example',
    'Skill reference depth validation test cases',
    'Skill reference depth validation failure modes',
    'how to verify skill reference depth validation',
    'QA skill authoring bounded reference chains with reachable supporting files',
    'Skill reference depth validation best practices',
  ],
  repoEvidence: [
    'seed-skills/cursor-skill-authoring/SKILL.md',
    'packages/shared/src/schemas/skill-schema.ts',
    'packages/web/src/app/blog/posts/article-factory-250-publication.test.ts',
    'docs/audit/SKILLS-AUDIT-2026-06.md',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/how-to-publish',
    '/getting-started',
    '/blog/how-to-write-high-quality-qa-skills',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
    '/blog/regression-testing-strategies-guide',
  ],
  relatedSlugs: [
    'how-to-write-high-quality-qa-skills',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
    'regression-testing-strategies-guide',
  ],
  sources: [
    'https://agentskills.io/specification',
    'https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview',
    'https://docs.cursor.com/context/rules',
  ],
  codeExamples: [
    {
      title: 'Build the Skill reference depth validation baseline',
      language: 'text',
      path: 'seed-skills/cursor-skill-authoring/SKILL.md',
      snippet:
        'project/\n  .cursor/\n    rules/\n      000-core.mdc                # Always: project-wide non-negotiables\n      testing-playwright.mdc      # Auto-Attached: globs **/*.spec.ts\n      testing-pytest.mdc          # Auto-Attached: globs tests/**/*.py\n      pr-format.mdc               # Agent-Requested: description-triggered\n      legacy-migration.mdc        # Manual: invoked with @legacy-migration\n  packages/\n    api/\n      .cursor/rules/\n        api-contracts.mdc         # nested: scoped to the api package',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/shared/src/schemas/skill-schema.ts',
      snippet:
        'minTokens: z.number().optional(),\n  maxTokens: z.number().optional(),\n});\n\nexport const skillCreateSchema = z.object({\n  name: z.string().min(1).max(100),\n  description: z.string().min(10).max(500),\n  githubUrl: z.string().url(),\n  testingTypes: z.array(z.string()).min(1),\n  frameworks: z.array(z.string()).default([]),\n  languages: z.array(z.string()).min(1),\n  domains: z.array(z.string()).default([]),\n});\n\nexport const skillSearchSchema = z.object({\n  query: z.string().optional(),\n  testingTypes: z.array(z.string()).optional(),\n  frameworks: z.array(z.string()).optional(),',
    },
  ],
});
