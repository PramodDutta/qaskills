'use client';

import { useAuth, SignInButton } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GitFork } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';

interface CloneButtonProps {
  author: string;
  slug: string;
}

export function CloneButton({ author, slug }: CloneButtonProps) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <Button variant="outline" className="w-full" asChild>
        <Link href={`/dashboard/create?clone=${encodeURIComponent(`${author}/${slug}`)}`}>
          <GitFork className="h-4 w-4" /> Clone & Edit
        </Link>
      </Button>
    );
  }

  return <AuthenticatedCloneButton author={author} slug={slug} />;
}

function AuthenticatedCloneButton({ author, slug }: CloneButtonProps) {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const handleClone = () => {
    trackEvent('clone_skill', { skill: slug, author });
    router.push(`/dashboard/create?clone=${encodeURIComponent(`${author}/${slug}`)}`);
  };

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <Button variant="outline" className="w-full">
          <GitFork className="h-4 w-4" /> Clone & Edit
        </Button>
      </SignInButton>
    );
  }

  return (
    <Button variant="outline" className="w-full" onClick={handleClone}>
      <GitFork className="h-4 w-4" /> Clone & Edit
    </Button>
  );
}
