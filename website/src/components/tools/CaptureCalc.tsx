import { useState, useMemo } from 'preact/hooks';

interface Creature {
  id: number; name: string; catchRate: number; type: string[];
}
interface TypeInfo { id: string; name: string; color: string; }

interface Props {
  creatures: Creature[];
  types: TypeInfo[];
}

const stones = [
  { name: '마석', mult: 1.0, color: '#9999bb' },
  { name: '상급 마석', mult: 1.5, color: '#3399FF' },
  { name: '최상급 마석', mult: 2.0, color: '#FFCC00' },
  { name: '지배의 마석', mult: 255, color: '#AA44CC' },
];

const statuses = [
  { name: '없음', mult: 1.0 },
  { name: '수면', mult: 2.5 },
  { name: '빙결', mult: 2.5 },
  { name: '독', mult: 1.5 },
  { name: '화상', mult: 1.5 },
  { name: '마비', mult: 1.5 },
];

export default function CaptureCalc({ creatures, types }: Props) {
  const [creatureId, setCreatureId] = useState(1);
  const [hpPercent, setHpPercent] = useState(50);
  const [stoneIdx, setStoneIdx] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);

  const typeMap = useMemo(() => {
    const m: Record<string, TypeInfo> = {};
    types.forEach(t => (m[t.id] = t));
    return m;
  }, [types]);

  const creature = creatures.find(c => c.id === creatureId);
  const stone = stones[stoneIdx];
  const status = statuses[statusIdx];

  const result = useMemo(() => {
    if (!creature) return null;

    const catchRate = creature.catchRate;
    const hpFactor = (100 - hpPercent) / 100; // 0 at full HP, 1 at 0 HP
    const hpMod = 1 + hpFactor * 2; // 1x at full, 3x at 0

    // Simplified capture formula
    const a = Math.min(255, (catchRate * stone.mult * status.mult * hpMod) / 3);
    const shakeProb = a / 255;
    const captureProb = Math.pow(shakeProb, 4); // 4 shakes needed
    const pct = Math.min(Math.round(captureProb * 10000) / 100, 100);

    return {
      probability: pct,
      shakeProb: Math.round(shakeProb * 100),
      expectedAttempts: pct > 0 ? Math.ceil(1 / (captureProb || 0.001)) : 999,
    };
  }, [creature, hpPercent, stoneIdx, statusIdx]);

  return (
    <div class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Creature selection */}
        <div class="pixel-card">
          <h3 class="text-sm text-pk-accent mb-3">대상 크리처</h3>
          <label for="cap-creature" class="sr-only">크리처 선택</label>
          <select
            id="cap-creature"
            value={creatureId}
            onChange={e => setCreatureId(Number((e.target as HTMLSelectElement).value))}
            class="w-full bg-pk-bg border-2 border-pk-border px-3 py-2 text-xs text-pk-text outline-none focus:border-pk-accent transition-colors mb-3"
            style={{  }}
          >
            {creatures.map(c => (
              <option key={c.id} value={c.id}>#{String(c.id).padStart(3,'0')} {c.name} (포획률: {c.catchRate})</option>
            ))}
          </select>

          {creature && (
            <div class="flex items-center gap-3 text-xs">
              <div class="flex gap-1">
                {creature.type.map(t => (
                  <span key={t} class="px-1.5 py-0.5 text-[9px] text-white" style={{ background: typeMap[t]?.color ?? '#888' }}>
                    {typeMap[t]?.name ?? t}
                  </span>
                ))}
              </div>
              <span class="text-pk-muted">기본 포획률: <strong class="text-pk-text">{creature.catchRate}</strong></span>
            </div>
          )}
        </div>

        {/* Conditions */}
        <div class="pixel-card">
          <h3 class="text-sm text-pk-accent mb-3">포획 조건</h3>

          <label class="text-[10px] text-pk-muted block mb-1">남은 HP: {hpPercent}%</label>
          <input
            type="range" min="1" max="100" value={hpPercent}
            onInput={e => setHpPercent(Number((e.target as HTMLInputElement).value))}
            class="w-full accent-pk-accent mb-4"
          />

          <label class="text-[10px] text-pk-muted block mb-1">마석 등급</label>
          <div class="flex flex-wrap gap-1.5 mb-4">
            {stones.map((s, i) => (
              <button
                key={i}
                onClick={() => setStoneIdx(i)}
                class="px-2 py-1 text-[10px] border-2 cursor-pointer transition-all"
                style={{
                  borderColor: stoneIdx === i ? s.color : '#3a3a5c',
                  color: stoneIdx === i ? '#fff' : s.color,
                  background: stoneIdx === i ? s.color : 'transparent',
                  textShadow: stoneIdx === i ? '1px 1px 0 rgba(0,0,0,0.5)' : 'none',
                }}
              >
                {s.name} ({s.mult}x)
              </button>
            ))}
          </div>

          <label class="text-[10px] text-pk-muted block mb-1">상태 이상</label>
          <div class="flex flex-wrap gap-1.5">
            {statuses.map((s, i) => (
              <button
                key={i}
                onClick={() => setStatusIdx(i)}
                class="px-2 py-1 text-[10px] border cursor-pointer transition-all"
                style={{
                  borderColor: statusIdx === i ? '#FFCC00' : '#3a3a5c',
                  color: statusIdx === i ? '#FFCC00' : '#9999bb',
                  background: statusIdx === i ? 'rgba(255,204,0,0.08)' : 'transparent',
                }}
              >
                {s.name} {s.mult > 1 && `(${s.mult}x)`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div class="pixel-card" style={{
          borderColor: result.probability >= 80 ? '#44BB4440' : result.probability >= 30 ? '#FFCC0040' : '#FF442240',
        }}>
          <h3 class="text-sm text-pk-accent mb-4">포획 확률</h3>

          <div class="grid grid-cols-3 gap-4 mb-5">
            <div class="text-center">
              <p class="text-[9px] text-pk-muted uppercase">포획 확률</p>
              <p class="text-2xl mt-1" style={{
                color: result.probability >= 80 ? '#44BB44' : result.probability >= 30 ? '#FFCC00' : '#FF4422',
              }}>
                {result.probability}%
              </p>
            </div>
            <div class="text-center">
              <p class="text-[9px] text-pk-muted uppercase">흔들림당 확률</p>
              <p class="text-lg text-pk-text mt-1">{result.shakeProb}%</p>
            </div>
            <div class="text-center">
              <p class="text-[9px] text-pk-muted uppercase">예상 시행 횟수</p>
              <p class="text-lg text-pk-text mt-1">~{Math.min(result.expectedAttempts, 999)}회</p>
            </div>
          </div>

          {/* Visual bar */}
          <div class="h-6 bg-pk-bg border border-pk-border/20 overflow-hidden relative">
            <div
              class="h-full transition-all duration-700"
              style={{
                width: `${result.probability}%`,
                background: result.probability >= 80
                  ? 'linear-gradient(90deg, #44BB44, #66DD66)'
                  : result.probability >= 30
                  ? 'linear-gradient(90deg, #FFCC00, #FFDD44)'
                  : 'linear-gradient(90deg, #FF4422, #FF6644)',
              }}
            />
            <span class="absolute inset-0 flex items-center justify-center text-[10px] text-white" style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.8)' }}>
              {result.probability}%
            </span>
          </div>

          {/* Shake visualization */}
          <div class="flex items-center justify-center gap-3 mt-4">
            {[1,2,3,4].map(shake => {
              const passed = (result.shakeProb / 100) >= (shake * 0.2);
              return (
                <div key={shake} class="text-center">
                  <div
                    class="w-8 h-8 border-2 flex items-center justify-center text-sm"
                    style={{
                      borderColor: passed ? '#44BB4460' : '#3a3a5c',
                      color: passed ? '#44BB44' : '#555566',
                      background: passed ? '#44BB4410' : 'transparent',
                    }}
                  >
                    {passed ? '◆' : '◇'}
                  </div>
                  <p class="text-[8px] text-pk-muted mt-1">{shake}차</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
