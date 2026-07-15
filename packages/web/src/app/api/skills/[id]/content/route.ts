import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { skills } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { readFallbackPlaywrightCliMarkdown } from '@/lib/fallback-skill-detail';
import { buildSkillMarkdown } from '@/lib/skill-markdown';

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
    return markdownResponse(buildSkillMarkdown(row));
  } catch {
    const fallback = fallbackContent(id);
    if (fallback) return markdownResponse(fallback);
    return NextResponse.json({ error: 'Failed to fetch skill content' }, { status: 500 });
  }
}
