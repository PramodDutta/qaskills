import { Card, CardContent } from '@/components/ui/card';

interface StepCardProps {
  step: number;
  title: string;
  children: React.ReactNode;
}

export function StepCard({ step, title, children }: StepCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
            {step}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{title}</h3>
            <div className="mt-3">{children}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
