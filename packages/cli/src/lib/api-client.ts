import type {
  Skill,
  SkillSearchParams,
  SkillSearchResult,
  Category,
} from '@qaskills/shared';

/**
 * HTTP client for the qaskills.sh API.
 * Uses native fetch (Node 18+). All methods are non-throwing by default --
 * callers should inspect the returned Result or catch as needed.
 *
 * The base URL can be overridden via the QASKILLS_API_URL environment variable.
 */

const BASE = (process.env.QASKILLS_API_URL || 'https://qaskills.sh').replace(/\/$/, '');
const DEFAULT_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildUrl(path: string, params?: Record<string, string | string[] | number | boolean | undefined>): string {
  const url = new URL(path, BASE);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) {
          url.searchParams.append(key, v);
        }
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `@qaskills/cli`,
        ...(init?.headers ?? {}),
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`API error ${res.status}: ${body || res.statusText}`);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Search skills with filtering, pagination, and sorting.
 */
export async function searchSkills(params: SkillSearchParams): Promise<SkillSearchResult> {
  const url = buildUrl('/api/skills', {
    q: params.query,
    testingTypes: params.testingTypes,
    frameworks: params.frameworks,
    languages: params.languages,
    domains: params.domains,
    agents: params.agents,
    sort: params.sort,
    page: params.page,
    pageSize: params.pageSize,
    verifiedOnly: params.verifiedOnly,
  });

  return request<SkillSearchResult>(url);
}

/**
 * Get full details of a single skill by ID or slug.
 */
export async function getSkill(idOrSlug: string): Promise<Skill> {
  const url = buildUrl(`/api/skills/${encodeURIComponent(idOrSlug)}`);
  return request<Skill>(url);
}

/**
 * Get the full category listing (testing types, frameworks, languages, etc.).
 */
export async function getCategories(): Promise<Category[]> {
  const url = buildUrl('/api/categories');
  return request<Category[]>(url);
}

/**
 * Submit anonymous install/remove telemetry event.
 */
export async function trackInstall(data: {
  skillId: string;
  action: 'install' | 'remove' | 'update';
  agents: string[];
  cliVersion: string;
}): Promise<void> {
  const url = buildUrl('/api/telemetry/install');
  await request<unknown>(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Publish a skill (requires authentication token).
 */
export async function publishSkill(
  data: { frontmatter: Record<string, unknown>; content: string },
  token: string,
): Promise<{ id: string; slug: string }> {
  const url = buildUrl('/api/skills');
  return request<{ id: string; slug: string }>(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
}
