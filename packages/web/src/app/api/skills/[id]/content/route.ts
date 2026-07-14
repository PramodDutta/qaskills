import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { skills } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { readFallbackPlaywrightCliMarkdown } from '@/lib/fallback-skill-detail';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function markdownResponse(content: string) {
  return new NextResponse(content, {
    status: 200,
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}

function fallbackContent(id: string) {
  if (id !== 'playwright-cli') return null;
  return readFallbackPlaywrightCliMarkdown();
}

/**
 * GET /api/skills/[id]/content
 *
 * Returns the complete SKILL.md text for a skill, reconstructed from DB fields.
 * The response is the raw markdown string (YAML frontmatter + body).
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const isUuid = UUID_REGEX.test(id);

    const rows = await db
      .select()
      .from(skills)
      .where(isUuid ? eq(skills.id, id) : eq(skills.slug, id))
      .limit(1);

    if (rows.length === 0) {
      const fallback = fallbackContent(id);
      if (fallback) return markdownResponse(fallback);
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    const row = rows[0];

    // Build YAML frontmatter
    const frontmatter: Record<string, unknown> = {
      name: row.name,
      description: row.description,
      version: row.version || '1.0.0',
      author: row.authorName,
      license: row.license || 'MIT',
    };

    const arrayFields = [
      'tags',
      'testingTypes',
      'frameworks',
      'languages',
      'domains',
      'agents',
    ] as const;

    for (const field of arrayFields) {
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

    // Body: use fullDescription if available, otherwise a minimal heading + description
    const body =
      row.fullDescription && row.fullDescription.length > 0
        ? row.fullDescription
        : `# ${row.name}\n\n${row.description}`;

    const content = `---\n${yamlLines.join('\n')}\n---\n\n${body}\n`;

    return markdownResponse(content);
  } catch {
    const fallback = fallbackContent(id);
    if (fallback) return markdownResponse(fallback);
    return NextResponse.json({ error: 'Failed to fetch skill content' }, { status: 500 });
  }
}
