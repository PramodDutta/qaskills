import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data } = body;

    if (type === 'user.created') {
      await db.insert(users).values({
        clerkId: data.id,
        email: data.email_addresses?.[0]?.email_address || '',
        username: data.username || data.id,
        name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
        avatar: data.image_url || '',
        githubHandle:
          data.external_accounts?.find(
            (a: Record<string, unknown>) => a.provider === 'oauth_github',
          )?.username || '',
      }).onConflictDoNothing();
    }

    if (type === 'user.updated') {
      await db.update(users).set({
        email: data.email_addresses?.[0]?.email_address || '',
        username: data.username || data.id,
        name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
        avatar: data.image_url || '',
        updatedAt: new Date(),
      }).where(eq(users.clerkId, data.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    );
  }
}
