import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Get the authenticated user from Clerk in an API route context.
 * Returns the DB user row if found, otherwise null.
 * Handles cases where Clerk is not available gracefully.
 */
export async function getAuthUser() {
  try {
    const { auth } = await import('@clerk/nextjs/server');
    const { userId } = await auth();
    if (!userId) return null;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    return user || null;
  } catch {
    return null;
  }
}
