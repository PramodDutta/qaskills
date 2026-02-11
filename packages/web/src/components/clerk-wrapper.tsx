import { ClerkProvider } from '@clerk/nextjs';

export function ClerkWrapper({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    // Skip Clerk in development without keys
    return <>{children}</>;
  }
  return <ClerkProvider>{children}</ClerkProvider>;
}
