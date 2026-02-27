import Link from 'next/link';
import { Download, Star, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QualityBadge } from './quality-badge';
import { formatNumber } from '@/lib/utils';
import type { SkillSummary } from '@qaskills/shared';

// Skills to highlight with yellow glow (synced with leaderboard)
const HIGHLIGHTED_SLUGS = new Set([
  'playwright-e2e',
  'playwright-advance-e2e',
  'playwright-skill-enhanced',
  'selenium-java',
  'selenium-advance-pom',
]);

// Accent colors by testing type (synced with leaderboard + homepage)
const typeAccents: Record<string, string> = {
  e2e: 'bg-blue-500',
  security: 'bg-red-500',
  api: 'bg-purple-500',
  unit: 'bg-indigo-500',
  performance: 'bg-pink-500',
  load: 'bg-pink-500',
  accessibility: 'bg-teal-500',
  visual: 'bg-cyan-500',
  integration: 'bg-amber-500',
  mobile: 'bg-violet-500',
};

interface SkillCardProps {
  skill: SkillSummary;
  averageRating?: number;
}

export function SkillCard({ skill, averageRating }: SkillCardProps) {
  const isHighlighted = HIGHLIGHTED_SLUGS.has(skill.slug);
  const primaryType = skill.testingTypes[0] || 'e2e';
  const accent = typeAccents[primaryType] ?? 'bg-gray-500';

  return (
    <Link href={`/skills/${skill.author}/${skill.slug}`}>
      <Card
        className={`group relative h-full overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
          isHighlighted
            ? 'border-yellow-300 dark:border-yellow-700/50 bg-gradient-to-br from-yellow-50 to-amber-50/50 dark:from-yellow-950/30 dark:to-amber-950/10 hover:border-yellow-400 shadow-sm'
            : 'hover:border-primary/30'
        }`}
      >
        {/* Left accent bar */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-1 ${accent} opacity-50 transition-opacity group-hover:opacity-100`}
        />

        <CardHeader className="pb-3 pl-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{skill.name}</h3>
                {skill.verified && (
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                )}
                {isHighlighted && (
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    HOT
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">by {skill.author}</p>
            </div>
            <QualityBadge score={skill.qualityScore} />
          </div>
        </CardHeader>
        <CardContent className="pb-3 pl-5">
          <p className="text-sm text-muted-foreground line-clamp-2">{skill.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skill.testingTypes.slice(0, 3).map((type) => (
              <Badge key={`tt-${type}`} variant="secondary" className="text-xs">
                {type}
              </Badge>
            ))}
            {skill.frameworks.slice(0, 2).map((fw) => (
              <Badge key={`fw-${fw}`} variant="outline" className="text-xs">
                {fw}
              </Badge>
            ))}
          </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground pl-5">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              {formatNumber(skill.installCount)}
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {skill.qualityScore}/100
            </span>
            {averageRating !== undefined && averageRating > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-yellow-500">★</span>
                {averageRating.toFixed(1)}
              </span>
            )}
          </div>
          {skill.featured && (
            <Badge variant="success" className="ml-auto text-xs">
              Featured
            </Badge>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}
