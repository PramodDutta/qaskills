import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default async function middleware(req: NextRequest) {
  // Only activate Clerk middleware when keys are configured
  if (
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY
  ) {
    try {
      const { clerkMiddleware, createRouteMatcher } = await import(
        '@clerk/nextjs/server'
      );
      const isPublicWebhook = createRouteMatcher([
        '/api/webhooks(.*)',
      ]);
      const isProtectedRoute = createRouteMatcher([
        '/dashboard(.*)',
        '/api/skills/create(.*)',
      ]);

      const handler = clerkMiddleware(async (auth, request) => {
        if (isPublicWebhook(request)) {
          return;
        }
        if (isProtectedRoute(request)) {
          await auth.protect();
        }
      });

      return handler(req, {} as never);
    } catch {
      // Clerk not available, pass through
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
