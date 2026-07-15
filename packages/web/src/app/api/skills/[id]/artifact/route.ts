import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import JSZip from 'jszip';
import { db } from '@/db';
import { skills } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { buildSkillMarkdown } from '@/lib/skill-markdown';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/skills/[id]/artifact?version=<semver>
 *
 * Returns the skill as a ZIP package laid out per the Agent Skills spec:
 * <slug>/SKILL.md at the root of the archive. The response carries a
 * SHA-256 checksum header so installers can verify integrity.
 *
 * Versioning: only the currently published version is materialized today.
 * A ?version= request that does not match it returns 404 rather than a
 * silently different artifact; immutable historical versions arrive with
 * the skill_versions storage work. /content remains untouched for legacy
 * clients that expect raw markdown.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const isUuid = UUID_REGEX.test(id);

    const rows = await db
      .select()
      .from(skills)
      .where(isUuid ? eq(skills.id, id) : eq(skills.slug, id))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    const row = rows[0];
    const currentVersion = row.version || '1.0.0';

    const requestedVersion = request.nextUrl.searchParams.get('version');
    if (requestedVersion && requestedVersion !== currentVersion) {
      return NextResponse.json(
        {
          error: `Version ${requestedVersion} is not available`,
          currentVersion,
        },
        { status: 404 },
      );
    }

    const skillMd = buildSkillMarkdown(row);

    const zip = new JSZip();
    zip.file(`${row.slug}/SKILL.md`, skillMd);
    const buffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    });

    const sha256 = createHash('sha256').update(buffer).digest('hex');

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${row.slug}-${currentVersion}.zip"`,
        'Content-Length': String(buffer.length),
        'X-Artifact-Sha256': sha256,
        'X-Artifact-Version': currentVersion,
        ETag: `"${sha256}"`,
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to build artifact' }, { status: 500 });
  }
}
