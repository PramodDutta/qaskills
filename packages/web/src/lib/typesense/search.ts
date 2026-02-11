import { getTypesenseClient, SKILLS_COLLECTION } from './client';
import type { SkillSearchParams, SkillSearchResult, SkillSummary } from '@qaskills/shared';

export async function searchSkills(params: SkillSearchParams): Promise<SkillSearchResult> {
  const client = getTypesenseClient();

  // Fallback if Typesense not configured
  if (!client) {
    return { skills: [], total: 0, page: params.page || 1, pageSize: params.pageSize || 20 };
  }

  const filterParts: string[] = [];
  if (params.testingTypes?.length) {
    filterParts.push(`testingTypes:=[${params.testingTypes.join(',')}]`);
  }
  if (params.frameworks?.length) {
    filterParts.push(`frameworks:=[${params.frameworks.join(',')}]`);
  }
  if (params.languages?.length) {
    filterParts.push(`languages:=[${params.languages.join(',')}]`);
  }
  if (params.domains?.length) {
    filterParts.push(`domains:=[${params.domains.join(',')}]`);
  }
  if (params.agents?.length) {
    filterParts.push(`agents:=[${params.agents.join(',')}]`);
  }
  if (params.verifiedOnly) {
    filterParts.push('verified:=true');
  }

  const sortMap: Record<string, string> = {
    trending: 'installCount:desc',
    most_installed: 'installCount:desc',
    newest: 'createdAt:desc',
    highest_quality: 'qualityScore:desc',
  };

  const page = params.page || 1;
  const pageSize = params.pageSize || 20;

  const result = await client.collections(SKILLS_COLLECTION).documents().search({
    q: params.query || '*',
    query_by: 'name,description,author',
    filter_by: filterParts.join(' && ') || undefined,
    sort_by: sortMap[params.sort || 'trending'],
    page,
    per_page: pageSize,
    facet_by: 'testingTypes,frameworks,languages,domains,agents',
  });

  const skills: SkillSummary[] = (result.hits || []).map((hit) => {
    const doc = hit.document as Record<string, unknown>;
    return {
      id: doc.id as string,
      name: doc.name as string,
      slug: doc.slug as string,
      description: doc.description as string,
      author: doc.author as string,
      qualityScore: doc.qualityScore as number,
      installCount: doc.installCount as number,
      testingTypes: doc.testingTypes as string[],
      frameworks: doc.frameworks as string[],
      featured: doc.featured as boolean,
      verified: doc.verified as boolean,
    };
  });

  return {
    skills,
    total: result.found,
    page,
    pageSize,
    facets: {
      testingTypes: extractFacetCounts(result, 'testingTypes'),
      frameworks: extractFacetCounts(result, 'frameworks'),
      languages: extractFacetCounts(result, 'languages'),
      domains: extractFacetCounts(result, 'domains'),
      agents: extractFacetCounts(result, 'agents'),
    },
  };
}

function extractFacetCounts(
  result: { facet_counts?: Array<{ field_name: string; counts: Array<{ value: string; count: number }> }> },
  field: string,
) {
  const facet = result.facet_counts?.find((f) => f.field_name === field);
  return facet?.counts?.map((c) => ({ value: c.value, count: c.count })) || [];
}
