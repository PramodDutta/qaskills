import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { skills, users } from '@/db/schema';
import { desc, eq, ilike, sql, and, or, type SQL } from 'drizzle-orm';
import { getAuthUser } from '@/lib/api-auth';

// ---------------------------------------------------------------------------
// Validation schema for skill creation
// ---------------------------------------------------------------------------
const publishSkillSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string().max(100).optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500),
  fullDescription: z.string().max(10000).optional().default(''),
  testingTypes: z.array(z.string()).default([]),
  frameworks: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  domains: z.array(z.string()).default([]),
  agents: z.array(z.string()).default([]),
  version: z.string().max(20).optional().default('1.0.0'),
  license: z.string().max(50).optional().default('MIT'),
  githubUrl: z.string().url('Invalid GitHub URL').or(z.literal('')).optional().default(''),
  tags: z.array(z.string()).default([]),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function calculateQualityScore(data: {
  description: string;
  fullDescription?: string;
  testingTypes: string[];
  frameworks: string[];
  agents: string[];
  githubUrl?: string;
  version?: string;
}): number {
  let score = 0;
  if (data.description && data.description.length > 100) score += 20;
  if (data.fullDescription && data.fullDescription.length > 0) score += 15;
  if (data.testingTypes.length > 0) score += 15;
  if (data.frameworks.length > 0) score += 15;
  if (data.agents.length > 3) score += 10;
  if (data.githubUrl && data.githubUrl.length > 0) score += 10;
  if (data.version && data.version.length > 0) score += 15;
  return score;
}

// ---------------------------------------------------------------------------
// POST /api/skills — publish a new skill
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in to publish a skill.' },
        { status: 401 },
      );
    }

    // 2. Parse & validate body
    const body = await request.json();
    const parsed = publishSkillSchema.safeParse(body);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message).join('; ');
      return NextResponse.json(
        { error: `Validation failed: ${messages}`, issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const data = parsed.data;

    // 3. Generate / validate slug
    const slug = data.slug && data.slug.length > 0 ? data.slug : generateSlug(data.name);
    if (!slug) {
      return NextResponse.json(
        { error: 'Could not generate a valid slug from the skill name.' },
        { status: 400 },
      );
    }

    // 4. Check slug uniqueness
    const [existing] = await db
      .select({ id: skills.id })
      .from(skills)
      .where(eq(skills.slug, slug))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: `A skill with the slug "${slug}" already exists. Please choose a different name.` },
        { status: 409 },
      );
    }

    // 5. Calculate quality score
    const qualityScore = calculateQualityScore({
      description: data.description,
      fullDescription: data.fullDescription,
      testingTypes: data.testingTypes,
      frameworks: data.frameworks,
      agents: data.agents,
      githubUrl: data.githubUrl,
      version: data.version,
    });

    // 6. Insert skill
    const [created] = await db
      .insert(skills)
      .values({
        name: data.name,
        slug,
        description: data.description,
        fullDescription: data.fullDescription || '',
        version: data.version || '1.0.0',
        license: data.license || 'MIT',
        githubUrl: data.githubUrl || '',
        authorId: user.id,
        authorName: user.username,
        tags: data.tags,
        testingTypes: data.testingTypes,
        frameworks: data.frameworks,
        languages: data.languages,
        domains: data.domains,
        agents: data.agents,
        qualityScore,
      })
      .returning();

    // 7. Update user's skillsPublished count
    try {
      await db
        .update(users)
        .set({ skillsPublished: sql`${users.skillsPublished} + 1` })
        .where(eq(users.id, user.id));
    } catch (updateErr) {
      // Non-critical — skill was created, just log the counter update failure
      console.error('Failed to update skillsPublished count:', updateErr);
    }

    // 8. Return the created skill
    return NextResponse.json(
      {
        skill: {
          id: created.id,
          name: created.name,
          slug: created.slug,
          description: created.description,
          qualityScore: created.qualityScore,
          testingTypes: created.testingTypes,
          frameworks: created.frameworks,
          languages: created.languages,
          domains: created.domains,
          agents: created.agents,
          authorName: created.authorName,
          createdAt: created.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('POST /api/skills error:', err);
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 },
    );
  }
}

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
