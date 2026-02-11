import { z } from 'zod';

export const skillFrontmatterSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(10).max(500),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  author: z.string().min(1).max(100),
  license: z.string().min(1),
  tags: z.array(z.string()).default([]),
  testingTypes: z.array(z.string()).min(1, 'At least one testing type is required'),
  frameworks: z.array(z.string()).default([]),
  languages: z.array(z.string()).min(1, 'At least one language is required'),
  domains: z.array(z.string()).default([]),
  agents: z.array(z.string()).default([]),
  minTokens: z.number().optional(),
  maxTokens: z.number().optional(),
});

export const skillCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(10).max(500),
  githubUrl: z.string().url(),
  testingTypes: z.array(z.string()).min(1),
  frameworks: z.array(z.string()).default([]),
  languages: z.array(z.string()).min(1),
  domains: z.array(z.string()).default([]),
});

export const skillSearchSchema = z.object({
  query: z.string().optional(),
  testingTypes: z.array(z.string()).optional(),
  frameworks: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  domains: z.array(z.string()).optional(),
  agents: z.array(z.string()).optional(),
  sort: z.enum(['trending', 'most_installed', 'newest', 'highest_quality']).optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  verifiedOnly: z.boolean().optional(),
});

export type SkillFrontmatterInput = z.infer<typeof skillFrontmatterSchema>;
export type SkillCreateInput = z.infer<typeof skillCreateSchema>;
export type SkillSearchInput = z.infer<typeof skillSearchSchema>;
