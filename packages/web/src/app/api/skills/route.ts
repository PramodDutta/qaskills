import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { skills } from '@/db/schema';
import { desc, asc, ilike, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const sort = searchParams.get('sort') || 'trending';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);
  const offset = (page - 1) * pageSize;

  try {
    const orderBy =
      sort === 'newest'
        ? desc(skills.createdAt)
        : sort === 'highest_quality'
          ? desc(skills.qualityScore)
          : desc(skills.installCount);

    const conditions = query ? ilike(skills.name, `%${query}%`) : undefined;

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(skills)
        .where(conditions)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(skills)
        .where(conditions),
    ]);

    const total = Number(countResult[0]?.count || 0);

    return NextResponse.json({
      skills: rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        author: row.authorName,
        qualityScore: row.qualityScore,
        installCount: row.installCount,
        testingTypes: row.testingTypes,
        frameworks: row.frameworks,
        languages: row.languages,
        domains: row.domains,
        featured: row.featured,
        verified: row.verified,
      })),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch skills' },
      { status: 500 },
    );
  }
}
