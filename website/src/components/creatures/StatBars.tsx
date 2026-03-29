import { useState, useEffect } from 'preact/hooks';

interface Props {
  stats: { hp: number; atk: number; def: number; spAtk: number; spDef: number; speed: number };
  color: string;
}

const labels: [string, string][] = [
  ['hp', 'HP'],
  ['atk', '공격'],
  ['def', '방어'],
  ['spAtk', '특공'],
  ['spDef', '특방'],
  ['speed', '속도'],
];

function getBarColor(val: number, accent: string): string {
  if (val >= 90) return accent;
  if (val >= 70) return '#44BB44';
  if (val >= 50) return '#FFCC00';
  return '#FF4422';
}

export default function StatBars({ stats, color }: Props) {
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div class="space-y-2">
      {labels.map(([key, label], i) => {
        const val = stats[key as keyof typeof stats];
        const pct = Math.min((val / 130) * 100, 100);
        const barColor = getBarColor(val, color);
        return (
          <div key={key} class="flex items-center gap-2 text-xs">
            <span class="w-8 text-right text-pk-muted shrink-0">{label}</span>
            <span class="w-7 text-right text-pk-text shrink-0">{val}</span>
            <div class="flex-1 h-3 bg-pk-bg border border-pk-muted/20 overflow-hidden relative">
              {/* Baseline markers */}
              <div class="absolute top-0 bottom-0 left-[38.4%] w-px bg-pk-muted/10" aria-hidden="true" />
              <div class="absolute top-0 bottom-0 left-[76.9%] w-px bg-pk-muted/10" aria-hidden="true" />
              <div
                class="h-full"
                style={{
                  width: mounted ? `${pct}%` : '0%',
                  background: `repeating-linear-gradient(90deg, ${barColor} 0px, ${barColor} 3px, ${barColor}99 3px, ${barColor}99 4px)`,
                  transition: `width 0.6s cubic-bezier(0.25, 0.8, 0.25, 1) ${i * 0.08}s`,
                }}
              />
            </div>
          </div>
        );
      })}
      <div class="flex items-center gap-2 text-xs mt-1 pt-1 border-t border-pk-muted/20">
        <span class="w-8 text-right text-pk-accent shrink-0">총합</span>
        <span class="w-7 text-right text-pk-accent shrink-0">{total}</span>
        <div class="flex-1 h-1 bg-pk-bg overflow-hidden">
          <div
            class="h-full"
            style={{
              width: mounted ? `${Math.min((total / 780) * 100, 100)}%` : '0%',
              background: `linear-gradient(90deg, ${color}60, ${color})`,
              transition: 'width 0.8s cubic-bezier(0.25, 0.8, 0.25, 1) 0.5s',
            }}
          />
        </div>
      </div>
    </div>
  );
}
