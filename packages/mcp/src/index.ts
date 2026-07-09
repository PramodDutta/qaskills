import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const VERSION = '0.1.0';
const BASE = (process.env.QASKILLS_API_URL || 'https://qaskills.sh').replace(/\/$/, '');
const DEFAULT_TIMEOUT_MS = 10_000;

type JsonObject = Record<string, unknown>;

type SearchSkill = {
  name?: unknown;
  slug?: unknown;
  description?: unknown;
  author?: unknown;
  qualityScore?: unknown;
  installCount?: unknown;
  testingTypes?: unknown;
  frameworks?: unknown;
};

function buildUrl(pathname: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(pathname, BASE);

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'User-Agent': `@qaskills/mcp/${VERSION}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const detail = body || response.statusText;
      throw new Error(`API request failed with status ${response.status} for ${url}: ${detail}`);
    }

    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`API request timed out after ${DEFAULT_TIMEOUT_MS}ms for ${url}`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function getJson<T>(pathname: string, params?: Record<string, string | number | undefined>) {
  const url = buildUrl(pathname, params);
  const response = await fetchWithTimeout(url);
  return (await response.json()) as T;
}

async function getText(pathname: string) {
  const url = buildUrl(pathname);
  const response = await fetchWithTimeout(url);
  return response.text();
}

function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function textResult(text: string) {
  return {
    content: [{ type: 'text' as const, text }],
  };
}

function jsonTextResult(value: unknown) {
  return textResult(JSON.stringify(value, null, 2));
}

function errorResult(error: unknown) {
  return {
    content: [{ type: 'text' as const, text: `Error: ${asErrorMessage(error)}` }],
    isError: true,
  };
}

function omitFullDescription(skill: JsonObject): JsonObject {
  const { fullDescription, ...rest } = skill;
  void fullDescription;
  return rest;
}

function normalizeSearchResponse(response: { skills?: SearchSkill[]; total?: unknown }): {
  total: unknown;
  skills: SearchSkill[];
} {
  return {
    total: response.total ?? 0,
    skills: (response.skills ?? []).map((skill) => ({
      name: skill.name,
      slug: skill.slug,
      description: skill.description,
      author: skill.author,
      qualityScore: skill.qualityScore,
      installCount: skill.installCount,
      testingTypes: skill.testingTypes,
      frameworks: skill.frameworks,
    })),
  };
}

function shouldTrackTelemetry(): boolean {
  return process.env.DO_NOT_TRACK !== '1' && process.env.QASKILLS_TELEMETRY !== '0';
}

function trackInstall(slug: string, agent: string): void {
  if (!shouldTrackTelemetry()) {
    return;
  }

  const url = buildUrl('/api/telemetry/install');
  fetchWithTimeout(url, {
    method: 'POST',
    body: JSON.stringify({
      skillSlug: slug,
      agentType: agent,
      installType: 'add',
      cliVersion: `mcp-${VERSION}`,
      agents: [agent],
      action: 'install',
    }),
  }).catch(() => undefined);
}

async function installSkill(slug: string, targetDir: string | undefined, agent: string) {
  const content = await getText(`/api/skills/${encodeURIComponent(slug)}/content`);
  const cwd = process.cwd();
  const target =
    targetDir ??
    (existsSync(path.join(cwd, '.claude'))
      ? path.join(cwd, '.claude', 'skills')
      : path.join(cwd, '.agents', 'skills'));
  const skillDir = path.resolve(cwd, target, slug);
  const skillPath = path.join(skillDir, 'SKILL.md');

  await mkdir(skillDir, { recursive: true });
  await writeFile(skillPath, content, 'utf8');
  trackInstall(slug, agent);

  return `Installed ${slug} to ${skillPath}. Reload your agent so it can discover the new skill.`;
}

const server = new McpServer(
  {
    name: 'qaskills',
    version: VERSION,
  },
  {
    instructions:
      'This server searches, inspects, and installs QA testing skills from qaskills.sh for MCP clients such as Claude Code and Cursor, and install_skill writes SKILL.md files into the current project.',
  },
);

server.registerTool(
  'search_skills',
  {
    title: 'Search skills',
    description:
      'Search QA skills on qaskills.sh by text, testing type, framework, language, agent, and sort.',
    inputSchema: {
      query: z.string().optional(),
      testingType: z.string().optional(),
      framework: z.string().optional(),
      language: z.string().optional(),
      agent: z.string().optional(),
      sort: z.enum(['trending', 'newest', 'quality', 'popular']).optional(),
      limit: z.number().min(1).max(50).default(10),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ query, testingType, framework, language, agent, sort, limit }) => {
    try {
      const response = await getJson<{ skills?: SearchSkill[]; total?: unknown }>('/api/skills', {
        q: query,
        testingType,
        framework,
        language,
        agent,
        sort,
        limit,
      });
      return jsonTextResult(normalizeSearchResponse(response));
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  'get_skill',
  {
    title: 'Get skill',
    description: 'Get JSON metadata for a QA skill by slug, excluding the full markdown body.',
    inputSchema: {
      slug: z.string(),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ slug }) => {
    try {
      const response = await getJson<JsonObject>(`/api/skills/${encodeURIComponent(slug)}`);
      return jsonTextResult(omitFullDescription(response));
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  'get_skill_content',
  {
    title: 'Get skill content',
    description: 'Get the raw SKILL.md markdown content for a QA skill by slug.',
    inputSchema: {
      slug: z.string(),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ slug }) => {
    try {
      return textResult(await getText(`/api/skills/${encodeURIComponent(slug)}/content`));
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  'install_skill',
  {
    title: 'Install skill',
    description:
      'Install a QA skill SKILL.md into the current project or an explicit target directory.',
    inputSchema: {
      slug: z.string(),
      targetDir: z.string().optional(),
      agent: z.string().default('claude-code'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  async ({ slug, targetDir, agent }) => {
    try {
      return textResult(await installSkill(slug, targetDir, agent));
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  'list_categories',
  {
    title: 'List categories',
    description:
      'List QASkills.sh categories grouped by testing type, framework, language, and domain.',
    inputSchema: {},
    annotations: { readOnlyHint: true },
  },
  async () => {
    try {
      return jsonTextResult(await getJson('/api/categories'));
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  'get_leaderboard',
  {
    title: 'Get leaderboard',
    description: 'Get top QA skills from the QASkills.sh leaderboard.',
    inputSchema: {
      limit: z.number().min(1).max(50).default(10),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ limit }) => {
    try {
      const response = await getJson<{ skills?: unknown[] }>('/api/leaderboard');
      return jsonTextResult({
        ...response,
        skills: (response.skills ?? []).slice(0, limit),
      });
    } catch (error) {
      return errorResult(error);
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(`Fatal MCP server error: ${asErrorMessage(error)}`);
  process.exit(1);
});
