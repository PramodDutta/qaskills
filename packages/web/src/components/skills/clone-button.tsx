'use client';

import { useAuth, SignInButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { GitFork } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CloneButtonProps {
  author: string;
  slug: string;
}

export function CloneButton({ author, slug }: CloneButtonProps) {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const handleClone = () => {
    window?.datafast?.('clone_skill', { skill: slug, author });
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
