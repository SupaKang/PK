import { useState, useMemo } from 'preact/hooks';

interface BaseStats {
  hp: number; atk: number; def: number; spAtk: number; spDef: number; speed: number;
}
interface Creature {
  id: number; name: string; type: string[]; baseStats: BaseStats;
  spriteConfig: { baseColor: string; accentColor: string; shape: string; features: string[] };
}
interface TypeInfo { id: string; name: string; color: string; }

interface Props {
  creatures: Creature[];
  types: TypeInfo[];
  spriteMap?: Record<number, string | null>;
}

const statLabels: [keyof BaseStats, string][] = [
  ['hp', 'HP'], ['atk', '공격'], ['def', '방어'],
  ['spAtk', '특공'], ['spDef', '특방'], ['speed', '속도'],
];
const keys = ['hp', 'atk', 'def', 'spAtk', 'spDef', 'speed'] as const;

export default function CreatureCompare({ creatures, types, spriteMap }: Props) {
  const [slots, setSlots] = useState<(number | null)[]>([1, 4, null]);

  const typeMap = useMemo(() => {
    const m: Record<string, TypeInfo> = {};
    types.forEach(t => (m[t.id] = t));
    return m;
  }, [types]);

  const selected = slots.map(id => id ? creatures.find(c => c.id === id) ?? null : null);

  const getSpriteUrl = (id: number): string | null => {
    if (!spriteMap) return null;
    const name = spriteMap[id];
    return name ? `/sprites/creatures/${name}.png` : null;
  };

  const maxStat = 130;

  // SVG radar overlay
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 80;
  const colors = ['#FFCC00', '#3399FF', '#FF4422'];

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
    const r = (value / maxStat) * radius;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const bgLevels = [0.25, 0.5, 0.75, 1.0];
  const labels = ['HP', '공격', '방어', '특공', '특방', '속도'];

  return (
    <div class="space-y-6">
      {/* Creature selectors */}
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {slots.map((id, i) => (
          <div key={i} class="pixel-card">
            <div class="flex items-center gap-2 mb-2">
              <span class="w-3 h-3 shrink-0" style={{ background: colors[i] }} />
              <label for={`compare-${i}`} class="text-[10px] text-pk-muted uppercase">크리처 {i + 1}</label>
            </div>
            <select
              id={`compare-${i}`}
              value={id ?? ''}
              onChange={e => {
                const val = (e.target as HTMLSelectElement).value;
                setSlots(prev => { const next = [...prev]; next[i] = val ? Number(val) : null; return next; });
              }}
              class="w-full bg-pk-bg border-2 border-pk-border px-2 py-1.5 text-xs text-pk-text outline-none focus:border-pk-accent transition-colors"
              style={{  }}
            >
              <option value="">선택 안 함</option>
              {creatures.map(c => (
                <option key={c.id} value={c.id}>#{String(c.id).padStart(3,'0')} {c.name}</option>
              ))}
            </select>

            {selected[i] && (
              <div class="mt-2 flex items-center gap-2">
                {getSpriteUrl(selected[i]!.id) ? (
                  <img src={getSpriteUrl(selected[i]!.id)!} alt="" class="w-8 h-8 object-contain" style={{ imageRendering: 'pixelated' }} />
                ) : (
                  <div class="w-8 h-8" style={{
                    background: `linear-gradient(135deg, ${selected[i]!.spriteConfig.baseColor}, ${selected[i]!.spriteConfig.accentColor})`,
                    clipPath: 'polygon(25% 75%, 25% 25%, 50% 10%, 75% 25%, 75% 75%, 50% 90%)',
                  }} />
                )}
                <div class="flex gap-1">
                  {selected[i]!.type.map(t => (
                    <span key={t} class="px-1 py-0 text-[8px] text-white" style={{ background: typeMap[t]?.color ?? '#888' }}>
                      {typeMap[t]?.name ?? t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Radar overlay */}
      <div class="pixel-card flex justify-center">
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} class="max-w-full">
          {bgLevels.map((level, i) => {
            const points = Array.from({ length: 6 }, (_, j) => {
              const p = getPoint(j, maxStat * level);
              return `${p.x},${p.y}`;
            }).join(' ');
            return <polygon key={i} points={points} fill="none" stroke="rgba(136,136,170,0.15)" stroke-width="1" />;
          })}
          {Array.from({ length: 6 }, (_, i) => {
            const p = getPoint(i, maxStat);
            return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(136,136,170,0.1)" stroke-width="1" />;
          })}
          {selected.map((c, ci) => {
            if (!c) return null;
            const points = keys.map((key, ki) => {
              const p = getPoint(ki, c.baseStats[key]);
              return `${p.x},${p.y}`;
            }).join(' ');
            return (
              <polygon
                key={ci}
                points={points}
                fill={`${colors[ci]}20`}
                stroke={colors[ci]}
                stroke-width="2"
                style={{ transition: 'all 0.4s ease' }}
              />
            );
          })}
          {labels.map((label, i) => {
            const p = getPoint(i, maxStat * 1.2);
            return (
              <text key={label} x={p.x} y={p.y} text-anchor="middle" dominant-baseline="middle" fill="#8888aa" font-size="9" font-family="inherit">
                {label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Stat comparison bars */}
      <div class="pixel-card">
        <h3 class="text-sm text-pk-accent mb-4">스탯 비교</h3>
        <div class="space-y-3">
          {statLabels.map(([key, label]) => (
            <div key={key}>
              <div class="flex items-center justify-between text-[10px] text-pk-muted mb-1">
                <span>{label}</span>
                <div class="flex gap-3">
                  {selected.map((c, i) => c && (
                    <span key={i} style={{ color: colors[i] }}>{c.baseStats[key]}</span>
                  ))}
                </div>
              </div>
              <div class="flex gap-0.5 h-2">
                {selected.map((c, i) => {
                  if (!c) return null;
                  const pct = (c.baseStats[key] / maxStat) * 100;
                  return (
                    <div key={i} class="flex-1 bg-pk-bg border border-pk-border/10 overflow-hidden">
                      <div class="h-full transition-all duration-500" style={{ width: `${pct}%`, background: colors[i] }} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {/* Totals */}
          <div class="pt-2 border-t border-pk-muted/20 flex items-center justify-between text-xs">
            <span class="text-pk-accent">총합</span>
            <div class="flex gap-3">
              {selected.map((c, i) => c && (
                <span key={i} class="font-bold" style={{ color: colors[i] }}>
                  {Object.values(c.baseStats).reduce((a, b) => a + b, 0)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
