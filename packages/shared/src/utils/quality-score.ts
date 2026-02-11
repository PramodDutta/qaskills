import type { ParsedSkill } from '../types/skill';

export interface QualityBreakdown {
  schema: number;
  documentation: number;
  completeness: number;
  freshness: number;
  total: number;
}

export function calculateQualityScore(skill: ParsedSkill): QualityBreakdown {
  const schema = scoreSchema(skill);
  const documentation = scoreDocumentation(skill);
  const completeness = scoreCompleteness(skill);
  const freshness = 15; // Default; real score uses timestamps

  const total = Math.min(100, schema + documentation + completeness + freshness);

  return { schema, documentation, completeness, freshness, total };
}

function scoreSchema(skill: ParsedSkill): number {
  let score = 0;
  const fm = skill.frontmatter;
  if (fm.name) score += 5;
  if (fm.description && fm.description.length >= 20) score += 5;
  if (fm.version) score += 3;
  if (fm.author) score += 3;
  if (fm.license) score += 2;
  if (fm.testingTypes.length > 0) score += 4;
  if (fm.frameworks.length > 0) score += 3;
  if (fm.languages.length > 0) score += 3;
  if (fm.domains.length > 0) score += 2;
  return Math.min(30, score);
}

function scoreDocumentation(skill: ParsedSkill): number {
  let score = 0;
  const content = skill.content;
  if (content.length > 100) score += 5;
  if (content.length > 500) score += 5;
  if (content.length > 1000) score += 5;
  if (content.includes('## ') || content.includes('### ')) score += 5;
  if (content.includes('```')) score += 5; // Code examples
  if (content.includes('- ') || content.includes('* ')) score += 3; // Lists
  return Math.min(30, score);
}

function scoreCompleteness(skill: ParsedSkill): number {
  let score = 0;
  const fm = skill.frontmatter;
  if (fm.tags.length >= 3) score += 5;
  if (fm.testingTypes.length >= 1) score += 5;
  if (fm.frameworks.length >= 1) score += 5;
  if (fm.agents.length >= 3) score += 5;
  if (fm.agents.length >= 10) score += 5;
  return Math.min(25, score);
}
