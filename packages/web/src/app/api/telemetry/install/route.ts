import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { installs, skills } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { normalizeInstallEvent } from '@/lib/telemetry-normalize';

/**
 * POST /api/telemetry/install
 *
 * Records an anonymous install/remove event. Accepts every payload shape the
 * CLI has ever sent (uuid, slug, or display name as the skill reference) and
 * resolves it to a real skills.id before touching the installs FK column.
 * Telemetry must never fail visibly, so every error path returns success.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = normalizeInstallEvent(body);

    if (!event) {
      return NextResponse.json({ error: 'skillId or skillSlug required' }, { status: 400 });
    }

    // Resolve the reference to a uuid: direct id, then slug, then display name.
    let resolvedId: string | null = null;
    if (event.refIsUuid) {
      resolvedId = event.ref;
    } else {
      const bySlug = await db
        .select({ id: skills.id })
        .from(skills)
        .where(eq(skills.slug, event.ref))
        .limit(1);
      if (bySlug.length > 0) {
        resolvedId = bySlug[0].id;
      } else {
        const byName = await db
          .select({ id: skills.id })
          .from(skills)
          .where(eq(skills.name, event.ref))
          .limit(1);
        if (byName.length > 0) resolvedId = byName[0].id;
      }
    }

    if (!resolvedId) {
      // Unknown skill (or GitHub/local install): nothing to record against.
      return NextResponse.json({ success: true });
    }

    await db.insert(installs).values({
      skillId: resolvedId,
      agentType: event.agentType,
      installType: event.installType,
      country: request.headers.get('cf-ipcountry') || '',
    });

    if (event.installType === 'add') {
      await db
        .update(skills)
        .set({
          installCount: sql`${skills.installCount} + 1`,
          weeklyInstalls: sql`${skills.weeklyInstalls} + 1`,
        })
        .where(eq(skills.id, resolvedId));
    }

    return NextResponse.json({ success: true });
  } catch {
    // Telemetry should never fail visibly
    return NextResponse.json({ success: true });
  }
}
