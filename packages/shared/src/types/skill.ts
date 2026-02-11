export interface SkillFrontmatter {
  name: string;
  description: string;
  version: string;
  author: string;
  license: string;
  tags: string[];
  testingTypes: string[];
  frameworks: string[];
  languages: string[];
  domains: string[];
  agents: string[];
  minTokens?: number;
  maxTokens?: number;
}

export interface Skill {
  id: string;
  name: string;
  slug: string;
  description: string;
  fullDescription: string;
  version: string;
  author: string;
  authorId: string;
  license: string;
  githubUrl: string;
  tags: string[];
  testingTypes: string[];
  frameworks: string[];
  languages: string[];
  domains: string[];
  agents: string[];
  qualityScore: number;
  installCount: number;
  weeklyInstalls: number;
  featured: boolean;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SkillSummary {
  id: string;
  name: string;
  slug: string;
  description: string;
  author: string;
  qualityScore: number;
  installCount: number;
  testingTypes: string[];
  frameworks: string[];
  featured: boolean;
  verified: boolean;
}

export interface ParsedSkill {
  frontmatter: SkillFrontmatter;
  content: string;
  raw: string;
}

export interface SkillSearchResult {
  skills: SkillSummary[];
  total: number;
  page: number;
  pageSize: number;
  facets?: SkillFacets;
}

export interface SkillFacets {
  testingTypes: FacetCount[];
  frameworks: FacetCount[];
  languages: FacetCount[];
  domains: FacetCount[];
  agents: FacetCount[];
}

export interface FacetCount {
  value: string;
  count: number;
}

export type SkillSortOption = 'trending' | 'most_installed' | 'newest' | 'highest_quality';

export interface SkillSearchParams {
  query?: string;
  testingTypes?: string[];
  frameworks?: string[];
  languages?: string[];
  domains?: string[];
  agents?: string[];
  sort?: SkillSortOption;
  page?: number;
  pageSize?: number;
  verifiedOnly?: boolean;
}
