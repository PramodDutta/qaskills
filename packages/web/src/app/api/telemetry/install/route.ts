import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { installs, skills } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { skillId, skillSlug, agentType, installType = 'add' } = body;

    if (!skillId && !skillSlug) {
      return NextResponse.json({ error: 'skillId or skillSlug required' }, { status: 400 });
    }

    // Record install
    const resolvedId = skillId || skillSlug;
    await db.insert(installs).values({
      skillId: resolvedId,
      agentType: agentType || 'unknown',
      installType,
      country: request.headers.get('cf-ipcountry') || '',
    });

    // Update install count
    if (installType === 'add') {
      await db
        .update(skills)
        .set({
          installCount: sql`${skills.installCount} + 1`,
          weeklyInstalls: sql`${skills.weeklyInstalls} + 1`,
        })
        .where(eq(skills.id, resolvedId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Telemetry should never fail visibly
    return NextResponse.json({ success: true });
  }
}
