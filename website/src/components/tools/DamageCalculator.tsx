import { useState, useMemo } from 'preact/hooks';

interface BaseStats {
  hp: number; atk: number; def: number; spAtk: number; spDef: number; speed: number;
}
interface Creature {
  id: number; name: string; type: string[]; baseStats: BaseStats;
}
interface TypeInfo { id: string; name: string; color: string; }
interface Skill {
  id: string; name: string; type: string;
  category: string; power: number; accuracy: number;
}

interface Props {
  creatures: Creature[];
  types: TypeInfo[];
  skills: Skill[];
  matchups: Record<string, Record<string, number>>;
}

export default function DamageCalculator({ creatures, types, skills, matchups }: Props) {
  const [atkId, setAtkId] = useState<number>(1);
  const [defId, setDefId] = useState<number>(4);
  const [skillId, setSkillId] = useState<string>('');
  const [atkLevel, setAtkLevel] = useState(50);

  const typeMap = useMemo(() => {
    const m: Record<string, TypeInfo> = {};
    types.forEach(t => (m[t.id] = t));
    return m;
  }, [types]);

  const attacker = creatures.find(c => c.id === atkId);
  const defender = creatures.find(c => c.id === defId);

  const attackerSkills = useMemo(() => {
    return skills.filter(s => s.power > 0);
  }, [skills]);

  const selectedSkill = skills.find(s => s.id === skillId);

  const result = useMemo(() => {
    if (!attacker || !defender || !selectedSkill || selectedSkill.power <= 0) return null;

    const isPhysical = selectedSkill.category === 'physical';
    const atkStat = isPhysical ? attacker.baseStats.atk : attacker.baseStats.spAtk;
    const defStat = isPhysical ? defender.baseStats.def : defender.baseStats.spDef;

    const baseDmg = ((2 * atkLevel / 5 + 2) * selectedSkill.power * atkStat / defStat) / 50 + 2;

    // STAB
    const stab = attacker.type.includes(selectedSkill.type) ? 1.5 : 1;

    // Type effectiveness
    let typeEff = 1;
    for (const defType of defender.type) {
      typeEff *= matchups[selectedSkill.type]?.[defType] ?? 1;
    }

    const minDmg = Math.floor(baseDmg * stab * typeEff * 0.85);
    const maxDmg = Math.floor(baseDmg * stab * typeEff * 1.0);
    const critDmg = Math.floor(baseDmg * stab * typeEff * 1.5);
    const hpPctMin = Math.round((minDmg / (defender.baseStats.hp * 2 + atkLevel + 10)) * 100);
    const hpPctMax = Math.round((maxDmg / (defender.baseStats.hp * 2 + atkLevel + 10)) * 100);

    return { minDmg, maxDmg, critDmg, stab, typeEff, hpPctMin, hpPctMax };
  }, [attacker, defender, selectedSkill, atkLevel, matchups]);

  const effLabel = (eff: number) => {
    if (eff === 0) return { text: '무효', color: '#555566' };
    if (eff < 1) return { text: '별로 효과적이지 않다', color: '#ff7777' };
    if (eff === 1) return { text: '보통', color: '#9999bb' };
    if (eff === 2) return { text: '효과가 굉장하다!', color: '#77ff88' };
    return { text: `${eff}x 효과!`, color: '#44ff66' };
  };

  return (
    <div class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Attacker */}
        <div class="pixel-card">
          <h3 class="text-sm text-pk-accent mb-3">공격 크리처</h3>
          <label for="atk-creature" class="sr-only">공격 크리처 선택</label>
          <select
            id="atk-creature"
            value={atkId}
            onChange={e => { setAtkId(Number((e.target as HTMLSelectElement).value)); setSkillId(''); }}
            class="w-full bg-pk-bg border-2 border-pk-border px-3 py-2 text-xs text-pk-text outline-none focus:border-pk-accent transition-colors mb-3"
            style={{  }}
          >
            {creatures.map(c => (
              <option key={c.id} value={c.id}>#{String(c.id).padStart(3,'0')} {c.name}</option>
            ))}
          </select>

          {attacker && (
            <div class="flex gap-1 mb-3">
              {attacker.type.map(t => (
                <span key={t} class="px-1.5 py-0.5 text-[9px] text-white" style={{ background: typeMap[t]?.color ?? '#888' }}>
                  {typeMap[t]?.name ?? t}
                </span>
              ))}
            </div>
          )}

          <label for="atk-level" class="text-[10px] text-pk-muted block mb-1">레벨: {atkLevel}</label>
          <input
            id="atk-level"
            type="range" min="1" max="100" value={atkLevel}
            onInput={e => setAtkLevel(Number((e.target as HTMLInputElement).value))}
            class="w-full accent-pk-accent"
          />
        </div>

        {/* Defender */}
        <div class="pixel-card">
          <h3 class="text-sm text-pk-accent mb-3">방어 크리처</h3>
          <label for="def-creature" class="sr-only">방어 크리처 선택</label>
          <select
            id="def-creature"
            value={defId}
            onChange={e => setDefId(Number((e.target as HTMLSelectElement).value))}
            class="w-full bg-pk-bg border-2 border-pk-border px-3 py-2 text-xs text-pk-text outline-none focus:border-pk-accent transition-colors mb-3"
            style={{  }}
          >
            {creatures.map(c => (
              <option key={c.id} value={c.id}>#{String(c.id).padStart(3,'0')} {c.name}</option>
            ))}
          </select>

          {defender && (
            <div class="flex gap-1">
              {defender.type.map(t => (
                <span key={t} class="px-1.5 py-0.5 text-[9px] text-white" style={{ background: typeMap[t]?.color ?? '#888' }}>
                  {typeMap[t]?.name ?? t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Skill selection */}
      <div class="pixel-card">
        <h3 class="text-sm text-pk-accent mb-3">사용 스킬</h3>
        <label for="skill-select" class="sr-only">스킬 선택</label>
        <select
          id="skill-select"
          value={skillId}
          onChange={e => setSkillId((e.target as HTMLSelectElement).value)}
          class="w-full bg-pk-bg border-2 border-pk-border px-3 py-2 text-xs text-pk-text outline-none focus:border-pk-accent transition-colors"
          style={{  }}
        >
          <option value="">스킬을 선택하세요</option>
          {attackerSkills.map(s => (
            <option key={s.id} value={s.id}>
              {s.name} ({typeMap[s.type]?.name ?? s.type} / {s.category === 'physical' ? '물리' : '특수'} / 위력 {s.power})
            </option>
          ))}
        </select>
      </div>

      {/* Result */}
      {result && selectedSkill && (
        <div class="pixel-card" style={{ borderColor: `${typeMap[selectedSkill.type]?.color ?? '#888'}40` }}>
          <h3 class="text-sm text-pk-accent mb-4">계산 결과</h3>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div class="bg-pk-bg p-3 border border-pk-border/20 text-center">
              <p class="text-[9px] text-pk-muted uppercase">최소 데미지</p>
              <p class="text-lg text-pk-text mt-1">{result.minDmg}</p>
            </div>
            <div class="bg-pk-bg p-3 border border-pk-border/20 text-center">
              <p class="text-[9px] text-pk-muted uppercase">최대 데미지</p>
              <p class="text-lg text-pk-text mt-1">{result.maxDmg}</p>
            </div>
            <div class="bg-pk-bg p-3 border border-pk-border/20 text-center">
              <p class="text-[9px] text-pk-muted uppercase">급소 데미지</p>
              <p class="text-lg text-[#FF4422] mt-1">{result.critDmg}</p>
            </div>
            <div class="bg-pk-bg p-3 border border-pk-border/20 text-center">
              <p class="text-[9px] text-pk-muted uppercase">추정 HP%</p>
              <p class="text-lg text-pk-text mt-1">{result.hpPctMin}~{result.hpPctMax}%</p>
            </div>
          </div>

          <div class="flex flex-wrap gap-3 text-xs">
            {result.stab > 1 && (
              <span class="px-2 py-1 bg-pk-accent/10 border border-pk-accent/30 text-pk-accent">
                STAB x{result.stab}
              </span>
            )}
            <span class="px-2 py-1 border" style={{
              borderColor: `${effLabel(result.typeEff).color}40`,
              color: effLabel(result.typeEff).color,
              background: `${effLabel(result.typeEff).color}08`,
            }}>
              상성 x{result.typeEff} — {effLabel(result.typeEff).text}
            </span>
          </div>

          {/* Damage bar visualization */}
          <div class="mt-4">
            <div class="h-4 bg-pk-bg border border-pk-border/20 overflow-hidden relative">
              <div
                class="h-full transition-all duration-500"
                style={{
                  width: `${Math.min(result.hpPctMax, 100)}%`,
                  background: result.hpPctMax >= 100
                    ? 'linear-gradient(90deg, #FF4422, #FF6644)'
                    : result.hpPctMax >= 50
                    ? 'linear-gradient(90deg, #FFCC00, #FF8844)'
                    : 'linear-gradient(90deg, #44BB44, #66CC66)',
                }}
              />
              <span class="absolute inset-0 flex items-center justify-center text-[9px] text-white" style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.8)' }}>
                {result.hpPctMin}~{result.hpPctMax}% HP
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
