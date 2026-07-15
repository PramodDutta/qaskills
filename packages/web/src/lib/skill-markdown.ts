/**
 * Reconstructs the canonical SKILL.md text for a skill row.
 * Shared by /api/skills/[id]/content (raw markdown) and
 * /api/skills/[id]/artifact (zipped package).
 */

export interface SkillMarkdownRow {
  name: string;
  description: string;
  version: string | null;
  authorName: string | null;
  license: string | null;
  githubUrl: string | null;
  fullDescription: string | null;
  tags: unknown;
  testingTypes: unknown;
  frameworks: unknown;
  languages: unknown;
  domains: unknown;
  agents: unknown;
}

const ARRAY_FIELDS = ['tags', 'testingTypes', 'frameworks', 'languages', 'domains', 'agents'] as const;

export function buildSkillMarkdown(row: SkillMarkdownRow): string {
  const frontmatter: Record<string, unknown> = {
    name: row.name,
    description: row.description,
    version: row.version || '1.0.0',
    author: row.authorName,
    license: row.license || 'MIT',
  };

  for (const field of ARRAY_FIELDS) {
    const value = row[field];
    if (Array.isArray(value) && value.length > 0) {
      frontmatter[field] = value;
    }
  }

  if (row.githubUrl) {
    frontmatter.githubUrl = row.githubUrl;
  }

  const yamlLines: string[] = [];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      yamlLines.push(`${key}: [${value.join(', ')}]`);
    } else {
      yamlLines.push(`${key}: ${value}`);
    }
  }

  const body =
    row.fullDescription && row.fullDescription.length > 0
      ? row.fullDescription
      : `# ${row.name}\n\n${row.description}`;

  return `---\n${yamlLines.join('\n')}\n---\n\n${body}\n`;
}
