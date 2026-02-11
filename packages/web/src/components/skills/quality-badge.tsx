import { cn } from '@/lib/utils';

interface QualityBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function QualityBadge({ score, size = 'sm' }: QualityBadgeProps) {
  const color =
    score >= 80
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
      : score >= 60
        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
        : score >= 40
          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100'
          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span className={cn('inline-flex items-center rounded-md font-semibold', color, sizeClasses[size])}>
      {score}
    </span>
  );
}
