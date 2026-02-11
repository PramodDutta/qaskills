'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AgentSelector } from './agent-selector';

const starterSkills = [
  { slug: 'playwright-e2e', name: 'Playwright E2E', types: ['e2e', 'web'] },
  { slug: 'cypress-e2e', name: 'Cypress E2E', types: ['e2e', 'web'] },
  { slug: 'jest-unit', name: 'Jest Unit', types: ['unit'] },
  { slug: 'k6-performance', name: 'K6 Performance', types: ['performance'] },
  { slug: 'owasp-security', name: 'OWASP Security', types: ['security'] },
];

export function SkillPicker() {
  const [selectedSkill, setSelectedSkill] = useState(starterSkills[0]);

  return (
    <div className="space-y-8">
      {/* Skill selection */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {starterSkills.map((skill) => (
          <button
            key={skill.slug}
            onClick={() => setSelectedSkill(skill)}
            className={cn(
              'rounded-lg border p-4 text-left transition-all duration-200',
              selectedSkill.slug === skill.slug
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card hover:border-primary/30',
            )}
          >
            <p className="font-medium">{skill.name}</p>
            <div className="mt-2 flex gap-1">
              {skill.types.map((type) => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {type}
                </Badge>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Agent selector with the chosen skill */}
      <AgentSelector selectedSkill={selectedSkill.slug} />
    </div>
  );
}
