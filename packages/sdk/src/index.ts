import type {
  Skill,
  SkillSummary,
  SkillSearchParams,
  SkillSearchResult,
  Category,
  ReviewCreateInput,
} from '@qaskills/shared';

export interface QASkillsConfig {
  baseUrl?: string;
  apiKey?: string;
}

export class QASkillsClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config: QASkillsConfig = {}) {
    this.baseUrl = config.baseUrl || 'https://qaskills.sh';
    this.apiKey = config.apiKey;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(`QASkills API error: ${error.error || res.statusText}`);
    }
    return res.json();
  }

  // Skills
  readonly skills = {
    list: (params?: SkillSearchParams): Promise<SkillSearchResult> => {
      const searchParams = new URLSearchParams();
      if (params?.query) searchParams.set('q', params.query);
      if (params?.sort) searchParams.set('sort', params.sort);
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
      const qs = searchParams.toString();
      return this.request<SkillSearchResult>(`/api/skills${qs ? `?${qs}` : ''}`);
    },

    get: (idOrSlug: string): Promise<Skill> => {
      return this.request<Skill>(`/api/skills/${idOrSlug}`);
    },

    search: (query: string, options?: Partial<SkillSearchParams>): Promise<SkillSearchResult> => {
      return this.skills.list({ query, ...options });
    },

    create: (data: {
      name: string;
      description: string;
      githubUrl: string;
      testingTypes: string[];
      frameworks?: string[];
      languages: string[];
    }): Promise<Skill> => {
      return this.request<Skill>('/api/skills', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  };

  // Categories
  readonly categories = {
    list: (): Promise<{
      testingTypes: Category[];
      frameworks: Category[];
      languages: Category[];
      domains: Category[];
    }> => {
      return this.request('/api/categories');
    },
  };

  // Reviews
  readonly reviews = {
    submit: (data: ReviewCreateInput): Promise<{ id: string }> => {
      return this.request('/api/reviews', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  };

  // Leaderboard
  readonly leaderboard = {
    get: (): Promise<{ skills: (SkillSummary & { rank: number })[]; updatedAt: string }> => {
      return this.request('/api/leaderboard');
    },
  };
}

export function createClient(config?: QASkillsConfig): QASkillsClient {
  return new QASkillsClient(config);
}

export default QASkillsClient;
