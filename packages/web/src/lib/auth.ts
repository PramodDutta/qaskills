import { auth, currentUser } from '@clerk/nextjs/server';

export async function getAuthUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

export async function requireAuth(): Promise<string> {
  const userId = await getAuthUserId();
  if (!userId) throw new Error('Unauthorized');
  return userId;
}

export async function getUser() {
  return currentUser();
}
