import matter from 'gray-matter';
import type { ParsedSkill, SkillFrontmatter } from '../types/skill';

export function parseSkillMd(raw: string): ParsedSkill {
  const { data, content } = matter(raw);

  const frontmatter: SkillFrontmatter = {
    name: data.name || '',
    description: data.description || '',
    version: data.version || '1.0.0',
    author: data.author || '',
    license: data.license || 'MIT',
    tags: toStringArray(data.tags),
    testingTypes: toStringArray(data.testingTypes),
    frameworks: toStringArray(data.frameworks),
    languages: toStringArray(data.languages),
    domains: toStringArray(data.domains),
    agents: toStringArray(data.agents),
    minTokens: typeof data.minTokens === 'number' ? data.minTokens : undefined,
    maxTokens: typeof data.maxTokens === 'number' ? data.maxTokens : undefined,
  };

  return { frontmatter, content: content.trim(), raw };
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

export function serializeSkillMd(frontmatter: SkillFrontmatter, content: string): string {
  const yaml = [
    '---',
    `name: "${frontmatter.name}"`,
    `description: "${frontmatter.description}"`,
    `version: "${frontmatter.version}"`,
    `author: "${frontmatter.author}"`,
    `license: "${frontmatter.license}"`,
    frontmatter.tags.length ? `tags:\n${frontmatter.tags.map((t) => `  - ${t}`).join('\n')}` : '',
    frontmatter.testingTypes.length
      ? `testingTypes:\n${frontmatter.testingTypes.map((t) => `  - ${t}`).join('\n')}`
      : '',
    frontmatter.frameworks.length
      ? `frameworks:\n${frontmatter.frameworks.map((f) => `  - ${f}`).join('\n')}`
      : '',
    frontmatter.languages.length
      ? `languages:\n${frontmatter.languages.map((l) => `  - ${l}`).join('\n')}`
      : '',
    frontmatter.domains.length
      ? `domains:\n${frontmatter.domains.map((d) => `  - ${d}`).join('\n')}`
      : '',
    frontmatter.agents.length
      ? `agents:\n${frontmatter.agents.map((a) => `  - ${a}`).join('\n')}`
      : '',
    '---',
  ]
    .filter(Boolean)
    .join('\n');

  return `${yaml}\n\n${content}\n`;
}
