'use client';

import { useAuth, SignInButton } from '@clerk/nextjs';
import { ReactNode, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

interface SignupGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  title?: string;
  description?: string;
}

export function SignupGate({
  feature,
  children,
  fallback,
  title = 'Sign in to access this feature',
  description = 'Create a free account to unlock this content and more.',
}: SignupGateProps) {
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      trackEvent('gate_hit', { feature });
    }
  }, [isLoaded, isSignedIn, feature]);

  // Show loading state while auth is loading
  if (!isLoaded) {
    return (
      <div className="animate-pulse bg-muted rounded-lg p-8">
        <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-muted-foreground/20 rounded w-1/2"></div>
      </div>
    );
  }

  // If signed in, show the gated content
  if (isSignedIn) {
    return <>{children}</>;
  }

  // If not signed in, show custom fallback or default gate UI
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <SignInButton mode="modal">
          <Button size="lg">Sign in to continue</Button>
        </SignInButton>
      </CardContent>
    </Card>
  );
}
