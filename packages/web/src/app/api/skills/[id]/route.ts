import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { skills } from '@/db/schema';
import { eq, or } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const rows = await db
      .select()
      .from(skills)
      .where(or(eq(skills.id, id), eq(skills.slug, id)))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    const row = rows[0];
    return NextResponse.json({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      fullDescription: row.fullDescription,
      version: row.version,
      author: row.authorName,
      license: row.license,
      githubUrl: row.githubUrl,
      qualityScore: row.qualityScore,
      installCount: row.installCount,
      weeklyInstalls: row.weeklyInstalls,
      testingTypes: row.testingTypes,
      frameworks: row.frameworks,
      languages: row.languages,
      domains: row.domains,
      agents: row.agents,
      featured: row.featured,
      verified: row.verified,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch skill' }, { status: 500 });
  }
}
