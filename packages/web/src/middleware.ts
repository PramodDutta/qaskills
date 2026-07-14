import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicWebhook = createRouteMatcher(['/api/webhooks(.*)']);

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/skills/create(.*)',
  '/api/reviews(.*)',
]);

const authenticatedMiddleware = clerkMiddleware(async (auth, request) => {
  const path = request.nextUrl.pathname;
  if (path.startsWith('/api/')) {
    console.log(`🛡️ [v7-hotfix] Middleware running for: ${path} | method: ${request.method}`);
  }
  if (isPublicWebhook(request)) {
    return;
  }
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

const testMiddleware = () => NextResponse.next();

export default process.env.QASKILLS_DISABLE_AUTH === '1' ? testMiddleware : authenticatedMiddleware;

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
