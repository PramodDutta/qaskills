'use client';

import { useEffect, useRef, useState } from 'react';

const stats = [
  { label: 'QA Skills', target: 280, suffix: '+' },
  { label: 'Agents Supported', target: 29, suffix: '' },
  { label: 'Testing Types', target: 18, suffix: '' },
  { label: 'Installs', target: 2400, suffix: '+' },
];

function useCountUp(target: number, trigger: boolean) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!trigger) return;
    let start = 0;
    const duration = 1500;
    const startTime = performance.now();

    function step(now: number) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.round(eased * target);
      setValue(start);
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }, [trigger, target]);

  return value;
}

export function StatsCounter() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="grid grid-cols-2 gap-8 md:grid-cols-4">
      {stats.map((stat) => (
        <StatItem key={stat.label} stat={stat} visible={visible} />
      ))}
    </div>
  );
}

function StatItem({ stat, visible }: { stat: (typeof stats)[number]; visible: boolean }) {
  const count = useCountUp(stat.target, visible);

  return (
    <div className="text-center">
      <div className="text-4xl font-bold text-primary tabular-nums">
        {count}
        {stat.suffix}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
    </div>
  );
}
