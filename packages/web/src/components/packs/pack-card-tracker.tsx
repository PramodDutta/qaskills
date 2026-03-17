'use client';

import { trackPackAction } from '@/lib/analytics';

interface PackCardTrackerProps {
  packSlug: string;
  skillCount: number;
  featured: boolean;
  children: React.ReactNode;
}

export function PackCardTracker({
  packSlug,
  skillCount,
  featured,
  children,
}: PackCardTrackerProps) {
  return (
    <div
      onClick={() => {
        trackPackAction('view', packSlug);
      }}
    >
      {children}
    </div>
  );
}
