import { NextResponse } from 'next/server';
import { db } from '@/db';
import { skills } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { cacheGetOrSet } from '@/lib/cache';

export async function GET() {
  try {
    const result = await cacheGetOrSet('leaderboard:all', async () => {
      const rows = await db
        .select({
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
        })
        .from(skills)
        .orderBy(desc(skills.installCount))
        .limit(50);

      return {
        skills: rows.map((row, i) => ({
          rank: i + 1,
          ...row,
        })),
        updatedAt: new Date().toISOString(),
      };
    }, 300);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
