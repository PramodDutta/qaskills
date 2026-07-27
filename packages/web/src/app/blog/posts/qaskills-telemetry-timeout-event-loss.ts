import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 371,
  slug: 'qaskills-telemetry-timeout-event-loss',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Telemetry Timeout Event Loss',
  description:
    'QASkills telemetry timeout event loss: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills telemetry timeout event loss',
  intent: 'informational',
  coreQuestion:
    'What should QA teams verify for QASkills telemetry timeout event loss, including abort timing and silent event loss without affecting commands?',
  intentBoundary:
    'Covers abort timing and silent event loss without affecting commands. Excludes main registry request timeouts.',
  secondaryKeywords: [
    'how to test telemetry timeout event loss',
    'telemetry timeout event loss test cases',
    'telemetry timeout event loss edge cases',
    'telemetry timeout event loss CI validation',
    'telemetry timeout event loss failure diagnostics',
    'telemetry timeout event loss regression coverage',
  ],
  repoEvidence: [
    'packages/cli/src/lib/telemetry.ts',
    'packages/cli/src/lib/api-client.ts',
    'packages/mcp/src/index.ts',
    'packages/web/src/lib/telemetry-normalize.ts',
    'packages/web/src/app/api/telemetry/install/route.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/privacy',
    '/blog/qaskills-cli-disable-telemetry-do-not-track',
    '/blog/install-telemetry-compatibility-tests',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
  ],
  relatedSlugs: [
    'qaskills-cli-disable-telemetry-do-not-track',
    'install-telemetry-compatibility-tests',
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
  ],
  sources: [
    'https://nodejs.org/api/environment_variables.html',
    'https://nodejs.org/api/globals.html#fetch',
    'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/DNT',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills telemetry timeout event loss baseline',
      language: 'typescript',
      path: 'packages/cli/src/lib/telemetry.ts',
      snippet:
        "export function sendTelemetry(event: {\n  skillId: string;\n  /** registry slug when known; the server resolves it to the skill row */\n  skillSlug?: string;\n  action: 'install' | 'remove' | 'update';\n  agents: string[];\n}): void {\n  if (!isTelemetryEnabled()) return;\n\n  // Fire-and-forget -- intentionally not awaited\n  trackInstall({\n    ...event,\n    cliVersion: CLI_VERSION,\n  }).catch(() => {\n    // Silently swallow all telemetry errors\n  });\n}",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/cli/src/lib/api-client.ts',
      snippet:
        "});\n\n  return request<SkillSearchResult>(url);\n}\n\n/**\n * Get full details of a single skill by ID or slug.\n */\nexport async function getSkill(idOrSlug: string): Promise<Skill> {\n  const url = buildUrl(`/api/skills/${encodeURIComponent(idOrSlug)}`);\n  return request<Skill>(url);\n}\n\n/**\n * Get the full category listing (testing types, frameworks, languages, etc.).\n */\nexport async function getCategories(): Promise<Category[]> {\n  const url = buildUrl('/api/categories');",
    },
  ],
});
