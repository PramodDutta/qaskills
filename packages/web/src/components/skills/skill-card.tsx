import Link from 'next/link';
import { Download, Star, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QualityBadge } from './quality-badge';
import { formatNumber } from '@/lib/utils';
import type { SkillSummary } from '@qaskills/shared';

interface SkillCardProps {
  skill: SkillSummary;
  averageRating?: number;
}

export function SkillCard({ skill, averageRating }: SkillCardProps) {
  return (
    <Link href={`/skills/${skill.author}/${skill.slug}`}>
      <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{skill.name}</h3>
                {skill.verified && (
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">by {skill.author}</p>
            </div>
            <QualityBadge score={skill.qualityScore} />
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-sm text-muted-foreground line-clamp-2">{skill.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skill.testingTypes.slice(0, 3).map((type) => (
              <Badge key={type} variant="secondary" className="text-xs">
                {type}
              </Badge>
            ))}
            {skill.frameworks.slice(0, 2).map((fw) => (
              <Badge key={fw} variant="outline" className="text-xs">
                {fw}
              </Badge>
            ))}
          </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
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
