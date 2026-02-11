import { Client } from 'typesense';

let client: Client | null = null;

export function getTypesenseClient(): Client | null {
  if (!process.env.TYPESENSE_API_KEY) return null;
  if (!client) {
    client = new Client({
      nodes: [
        {
          host: process.env.TYPESENSE_HOST || 'localhost',
          port: parseInt(process.env.TYPESENSE_PORT || '8108', 10),
          protocol: process.env.TYPESENSE_PROTOCOL || 'http',
        },
      ],
      apiKey: process.env.TYPESENSE_API_KEY,
      connectionTimeoutSeconds: 5,
    });
  }
  return client;
}

export const SKILLS_COLLECTION = 'skills';

export const skillsSchema = {
  name: SKILLS_COLLECTION,
  fields: [
    { name: 'name', type: 'string' as const },
    { name: 'slug', type: 'string' as const },
    { name: 'description', type: 'string' as const },
    { name: 'author', type: 'string' as const, facet: true },
    { name: 'testingTypes', type: 'string[]' as const, facet: true },
    { name: 'frameworks', type: 'string[]' as const, facet: true },
    { name: 'languages', type: 'string[]' as const, facet: true },
    { name: 'domains', type: 'string[]' as const, facet: true },
    { name: 'agents', type: 'string[]' as const, facet: true },
    { name: 'qualityScore', type: 'int32' as const },
    { name: 'installCount', type: 'int32' as const },
    { name: 'featured', type: 'bool' as const, facet: true },
    { name: 'verified', type: 'bool' as const, facet: true },
    { name: 'createdAt', type: 'int64' as const },
  ],
  default_sorting_field: 'installCount',
};
