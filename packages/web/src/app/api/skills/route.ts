import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { skills } from '@/db/schema';
import { desc, ilike, sql, and, or, type SQL } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const sort = searchParams.get('sort') || 'trending';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20', 10)), 100);
  const offset = (page - 1) * limit;

  // Filter params (can be repeated for multi-select)
  const testingTypes = searchParams.getAll('testingType');
  const frameworks = searchParams.getAll('framework');
  const languages = searchParams.getAll('language');
  const domains = searchParams.getAll('domain');
  const agents = searchParams.getAll('agent');

  try {
    // Build conditions array
    const conditions: SQL[] = [];

    // Text search on name and description
    if (query) {
      conditions.push(
        or(
          ilike(skills.name, `%${query}%`),
          ilike(skills.description, `%${query}%`),
        )!,
      );
    }

    // JSONB array filters using @> (contains) operator
    if (testingTypes.length > 0) {
      const typeConditions = testingTypes.map(
        (t) => sql`${skills.testingTypes} @> ${JSON.stringify([t])}::jsonb`,
      );
      conditions.push(or(...typeConditions)!);
    }

    if (frameworks.length > 0) {
      const fwConditions = frameworks.map(
        (f) => sql`${skills.frameworks} @> ${JSON.stringify([f])}::jsonb`,
      );
      conditions.push(or(...fwConditions)!);
    }

    if (languages.length > 0) {
      const langConditions = languages.map(
        (l) => sql`${skills.languages} @> ${JSON.stringify([l])}::jsonb`,
      );
      conditions.push(or(...langConditions)!);
    }

    if (domains.length > 0) {
      const domainConditions = domains.map(
        (d) => sql`${skills.domains} @> ${JSON.stringify([d])}::jsonb`,
      );
      conditions.push(or(...domainConditions)!);
    }

    if (agents.length > 0) {
      const agentConditions = agents.map(
        (a) => sql`${skills.agents} @> ${JSON.stringify([a])}::jsonb`,
      );
      conditions.push(or(...agentConditions)!);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Sort order
    let orderBy;
    switch (sort) {
      case 'newest':
        orderBy = desc(skills.createdAt);
        break;
      case 'highest_quality':
      case 'quality':
        orderBy = desc(skills.qualityScore);
        break;
      case 'most_installed':
      case 'popular':
        orderBy = desc(skills.installCount);
        break;
      case 'trending':
      default:
        orderBy = desc(skills.weeklyInstalls);
        break;
    }

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(skills)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(skills)
        .where(whereClause),
    ]);

    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);

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
      totalPages,
    });
  } catch {
    return NextResponse.json({
      skills: [],
      total: 0,
      page,
      totalPages: 0,
    });
  }
}
