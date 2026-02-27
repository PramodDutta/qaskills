import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SkillCreator } from '@/components/skills/skill-creator';

export const metadata: Metadata = {
  title: 'Create Skill',
  description: 'Create or clone a QA skill using the SKILL.md editor with live preview.',
  robots: { index: false, follow: false },
};

export default function CreateSkillPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-16 text-center text-muted-foreground">Loading editor...</div>}>
      <SkillCreator />
    </Suspense>
  );
}
