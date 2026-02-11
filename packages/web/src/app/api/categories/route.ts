import { NextResponse } from 'next/server';
import { db } from '@/db';
import { categories } from '@/db/schema';
import { cacheGetOrSet } from '@/lib/cache';
import type { CategoryRow } from '@/db/schema';

export async function GET() {
  try {
    const result = await cacheGetOrSet('categories:all', async () => {
      const rows = await db.select().from(categories);

      const grouped: Record<string, CategoryRow[]> = {
        testingType: [],
        framework: [],
        language: [],
        domain: [],
      };

      for (const row of rows) {
        if (grouped[row.type]) {
          grouped[row.type].push(row);
        }
      }

      return grouped;
    }, 3600);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}
