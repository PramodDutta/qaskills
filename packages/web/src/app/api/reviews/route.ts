import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reviews, skills, users } from '@/db/schema';
import { eq, desc, and, avg, count } from 'drizzle-orm';
import { getAuthUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const skillId = searchParams.get('skillId');

  if (!skillId) {
    return NextResponse.json(
      { error: 'skillId query parameter is required' },
      { status: 400 },
    );
  }

  try {
    // Fetch reviews joined with users for reviewer info
    const reviewRows = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        helpfulCount: reviews.helpfulCount,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
        userName: users.name,
        userAvatar: users.avatar,
        userUsername: users.username,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.skillId, skillId))
      .orderBy(desc(reviews.createdAt));

    // Compute aggregate stats
    const statsResult = await db
      .select({
        averageRating: avg(reviews.rating),
        totalReviews: count(reviews.id),
      })
      .from(reviews)
      .where(eq(reviews.skillId, skillId));

    const averageRating = statsResult[0]?.averageRating
      ? parseFloat(Number(statsResult[0].averageRating).toFixed(1))
      : 0;
    const totalReviews = Number(statsResult[0]?.totalReviews || 0);

    return NextResponse.json({
      reviews: reviewRows.map((row) => ({
        id: row.id,
        rating: row.rating,
        comment: row.comment,
        helpfulCount: row.helpfulCount,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        user: {
          name: row.userName,
          avatar: row.userAvatar,
          username: row.userUsername,
        },
      })),
      averageRating,
      totalReviews,
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  // Authenticate the user
  let clerkUserId: string | null;
  try {
    clerkUserId = await getAuthUserId();
  } catch {
    clerkUserId = null;
  }

  if (!clerkUserId) {
    return NextResponse.json(
      { error: 'Authentication required. Please sign in to leave a review.' },
      { status: 401 },
    );
  }

  // Parse request body
  let body: { skillId?: string; rating?: number; comment?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const { skillId, rating, comment } = body;

  // Validate required fields
  if (!skillId) {
    return NextResponse.json(
      { error: 'skillId is required' },
      { status: 400 },
    );
  }

  if (rating === undefined || rating === null) {
    return NextResponse.json(
      { error: 'rating is required' },
      { status: 400 },
    );
  }

  // Validate rating range
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: 'rating must be an integer between 1 and 5' },
      { status: 400 },
    );
  }

  // Validate comment length
  if (comment && comment.length > 1000) {
    return NextResponse.json(
      { error: 'comment must be 1000 characters or fewer' },
      { status: 400 },
    );
  }

  try {
    // Look up the user in our DB by their Clerk ID
    const userRows = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1);

    if (userRows.length === 0) {
      return NextResponse.json(
        { error: 'User not found. Please ensure your account is set up.' },
        { status: 400 },
      );
    }

    const user = userRows[0];

    // Verify the skill exists
    const skillRows = await db
      .select({ id: skills.id })
      .from(skills)
      .where(eq(skills.id, skillId))
      .limit(1);

    if (skillRows.length === 0) {
      return NextResponse.json(
        { error: 'Skill not found' },
        { status: 400 },
      );
    }

    // Check for duplicate review (one review per user per skill)
    const existingReview = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(eq(reviews.skillId, skillId), eq(reviews.userId, user.id)))
      .limit(1);

    if (existingReview.length > 0) {
      return NextResponse.json(
        { error: 'You have already reviewed this skill' },
        { status: 409 },
      );
    }

    // Insert the review
    const inserted = await db
      .insert(reviews)
      .values({
        skillId,
        userId: user.id,
        rating,
        comment: comment || '',
      })
      .returning();

    const newReview = inserted[0];

    return NextResponse.json({
      review: {
        id: newReview.id,
        rating: newReview.rating,
        comment: newReview.comment,
        helpfulCount: newReview.helpfulCount,
        createdAt: newReview.createdAt,
        updatedAt: newReview.updatedAt,
        user: {
          name: user.name,
          avatar: user.avatar,
          username: user.username,
        },
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 },
    );
  }
}
