import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 302,
  slug: 'qaskills-telemetry-process-shutdown-delivery',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Telemetry Process Shutdown Delivery',
  description:
    'QASkills telemetry process shutdown delivery: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'QASkills telemetry process shutdown delivery',
  intent: 'troubleshooting',
  coreQuestion:
    'How should QA teams diagnose QASkills telemetry process shutdown delivery, including fire-and-forget requests surviving or being lost at command exit?',
  intentBoundary:
    'Covers fire-and-forget requests surviving or being lost at command exit. Excludes whether users can opt out.',
  secondaryKeywords: [
    'how to test telemetry process shutdown delivery',
    'telemetry process shutdown delivery test cases',
    'telemetry process shutdown delivery edge cases',
    'telemetry process shutdown delivery CI validation',
    'telemetry process shutdown delivery failure diagnostics',
    'telemetry process shutdown delivery regression coverage',
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
      title: 'Build the QASkills telemetry process shutdown delivery baseline',
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
