import { NextResponse } from 'next/server';
import { db } from '@/db';
import { skills } from '@/db/schema';
import { desc, sql } from 'drizzle-orm';
import { cacheGetOrSet } from '@/lib/cache';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';

    const result = await cacheGetOrSet(`leaderboard:${filter}`, async () => {
      const selectFields = {
        id: skills.id,
        name: skills.name,
        slug: skills.slug,
        author: skills.authorName,
        installCount: skills.installCount,
        weeklyInstalls: skills.weeklyInstalls,
        qualityScore: skills.qualityScore,
        testingTypes: skills.testingTypes,
        frameworks: skills.frameworks,
        verified: skills.verified,
        createdAt: skills.createdAt,
      };

      let rows;

      // Apply sorting based on filter
      switch (filter) {
        case 'trending':
          rows = await db
            .select(selectFields)
            .from(skills)
            .orderBy(desc(skills.weeklyInstalls), desc(skills.createdAt))
            .limit(50);
          break;
        case 'hot':
          // Hot = weighted score: 70% installs + 30% quality
          rows = await db
            .select(selectFields)
            .from(skills)
            .orderBy(desc(sql`(${skills.installCount} * 0.7 + ${skills.qualityScore} * 0.3)`))
            .limit(50);
          break;
        case 'new':
          rows = await db
            .select(selectFields)
            .from(skills)
            .orderBy(desc(skills.createdAt))
            .limit(50);
          break;
        case 'all':
        default:
          rows = await db
            .select(selectFields)
            .from(skills)
            .orderBy(desc(skills.installCount))
            .limit(50);
          break;
      }

      return {
        skills: rows.map((row, i) => {
          const { createdAt, ...rest } = row;
          return {
            rank: i + 1,
            ...rest,
            createdAt: createdAt.toISOString(),
          };
        }),
        filter,
        updatedAt: new Date().toISOString(),
      };
    }, 300);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
