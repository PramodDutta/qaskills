'use client';

import type { ReactNode } from 'react';
import { WebinarBoundary } from './webinar-boundary';
import { WebinarCard, type WebinarPlacement } from './webinar-card';
import { useWebinar } from './use-webinar';

interface WebinarSlotProps {
  placement: WebinarPlacement;
  variant?: 'inline' | 'sidebar';
  className?: string;
  /** What the slot normally shows: rendered on the server, before mount, and after the batch. */
  children: ReactNode;
}

/**
 * Lends an existing promo slot to the webinar invite while a session is
 * upcoming or live. The server HTML always carries `children`, and any runtime
 * error falls back to `children`, so the page never loses its original content.
 */
export function WebinarSlot(props: WebinarSlotProps) {
  return (
    <WebinarBoundary fallback={props.children}>
      <Slot {...props} />
    </WebinarBoundary>
  );
}

function Slot({ placement, variant = 'inline', className, children }: WebinarSlotProps) {
  const view = useWebinar();
  if (!view) return <>{children}</>;
  return <WebinarCard view={view} placement={placement} variant={variant} className={className} />;
}
