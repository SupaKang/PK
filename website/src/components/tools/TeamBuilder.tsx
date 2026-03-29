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
  matchups: Record<string, Record<string, number>>;
  spriteMap?: Record<number, string | null>;
}

export default function TeamBuilder({ creatures, types, matchups, spriteMap }: Props) {
  const [team, setTeam] = useState<(number | null)[]>([null, null, null, null, null, null]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const typeMap = useMemo(() => {
    const m: Record<string, TypeInfo> = {};
    types.forEach(t => (m[t.id] = t));
    return m;
  }, [types]);

  const getSpriteUrl = (id: number): string | null => {
    if (!spriteMap) return null;
    const name = spriteMap[id];
    return name ? `/sprites/creatures/${name}.png` : null;
  };

  const teamCreatures = team.map(id => id ? creatures.find(c => c.id === id) ?? null : null);
  const teamTypes = new Set<string>();
  teamCreatures.forEach(c => c?.type.forEach(t => teamTypes.add(t)));

  // Type coverage analysis
  const coverage = useMemo(() => {
    const offenseGood: Record<string, number> = {};
    const defenseWeak: Record<string, number> = {};
    const defenseResist: Record<string, number> = {};

    types.forEach(defType => {
      // How many team members can hit this type super-effectively?
      let superEffCount = 0;
      teamCreatures.forEach(c => {
        if (!c) return;
        c.type.forEach(atkType => {
          if ((matchups[atkType]?.[defType.id] ?? 1) >= 2) superEffCount++;
        });
      });
      offenseGood[defType.id] = superEffCount;
    });

    types.forEach(atkType => {
      let weakCount = 0;
      let resistCount = 0;
      teamCreatures.forEach(c => {
        if (!c) return;
        let eff = 1;
        c.type.forEach(defType => {
          eff *= matchups[atkType.id]?.[defType] ?? 1;
        });
        if (eff >= 2) weakCount++;
        if (eff < 1) resistCount++;
      });
      defenseWeak[atkType.id] = weakCount;
      defenseResist[atkType.id] = resistCount;
    });

    return { offenseGood, defenseWeak, defenseResist };
  }, [team, matchups, types]);

  const filteredCreatures = useMemo(() => {
    return creatures.filter(c => {
      if (search && !c.name.includes(search)) return false;
      if (typeFilter && !c.type.includes(typeFilter)) return false;
      return true;
    });
  }, [creatures, search, typeFilter]);

  const addToTeam = (id: number) => {
    setTeam(prev => {
      const next = [...prev];
      const emptySlot = next.findIndex(s => s === null);
      if (emptySlot >= 0) next[emptySlot] = id;
      return next;
    });
  };

  const removeFromTeam = (index: number) => {
    setTeam(prev => { const next = [...prev]; next[index] = null; return next; });
  };

  const teamCount = team.filter(Boolean).length;
  const avgStats = useMemo(() => {
    const active = teamCreatures.filter(Boolean) as Creature[];
    if (active.length === 0) return null;
    const sum = { hp: 0, atk: 0, def: 0, spAtk: 0, spDef: 0, speed: 0 };
    active.forEach(c => {
      (Object.keys(sum) as (keyof BaseStats)[]).forEach(k => { sum[k] += c.baseStats[k]; });
    });
    (Object.keys(sum) as (keyof BaseStats)[]).forEach(k => { sum[k] = Math.round(sum[k] / active.length); });
    return sum;
  }, [team]);

  // Share URL
  const shareUrl = useMemo(() => {
    const ids = team.filter(Boolean).join(',');
    if (!ids) return '';
    return `${window.location.origin}/tools/team-builder?team=${ids}`;
  }, [team]);

  return (
    <div class="space-y-6">
      {/* Team slots */}
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {team.map((id, i) => {
          const c = teamCreatures[i];
          return (
            <div key={i} class="pixel-card p-2 text-center min-h-[120px] flex flex-col items-center justify-center relative">
              {c ? (
                <>
                  <button
                    onClick={() => removeFromTeam(i)}
                    class="absolute top-1 right-1 text-pk-muted hover:text-[#FF4422] text-[10px] cursor-pointer transition-colors w-5 h-5 flex items-center justify-center"
                    style={{  }}
                    aria-label={`${c.name} 제거`}
                  >
                    ✕
                  </button>
                  {getSpriteUrl(c.id) ? (
                    <img src={getSpriteUrl(c.id)!} alt="" class="w-10 h-10 object-contain mb-1" style={{ imageRendering: 'pixelated' }} />
                  ) : (
                    <div class="w-10 h-10 mb-1" style={{
                      background: `linear-gradient(135deg, ${c.spriteConfig.baseColor}, ${c.spriteConfig.accentColor})`,
                      clipPath: 'polygon(25% 75%, 25% 25%, 50% 10%, 75% 25%, 75% 75%, 50% 90%)',
                    }} />
                  )}
                  <p class="text-[10px] text-pk-text truncate w-full">{c.name}</p>
                  <div class="flex gap-0.5 mt-1">
                    {c.type.map(t => (
                      <span key={t} class="w-2 h-2" style={{ background: typeMap[t]?.color ?? '#888' }} />
                    ))}
                  </div>
                </>
              ) : (
                <span class="text-pk-muted/30 text-2xl">+</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Share */}
      {teamCount > 0 && shareUrl && (
        <div class="flex items-center gap-2">
          <input
            type="text"
            value={shareUrl}
            readOnly
            class="flex-1 bg-pk-bg border border-pk-border/30 px-2 py-1 text-[10px] text-pk-muted outline-none"
            style={{  }}
          />
          <button
            onClick={() => navigator.clipboard?.writeText(shareUrl)}
            class="px-3 py-1 text-[10px] border border-pk-border/30 text-pk-muted hover:text-pk-accent hover:border-pk-accent/30 cursor-pointer transition-colors"
            style={{  }}
          >
            복사
          </button>
        </div>
      )}

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Type coverage */}
        <div class="pixel-card">
          <h3 class="text-sm text-pk-accent mb-3">타입 커버리지</h3>
          {teamCount === 0 ? (
            <p class="text-xs text-pk-muted">크리처를 추가하면 타입 커버리지를 분석합니다.</p>
          ) : (
            <div class="space-y-4">
              <div>
                <p class="text-[10px] text-pk-muted mb-1.5">공격 커버리지 (STAB 효과적)</p>
                <div class="flex flex-wrap gap-1">
                  {types.map(t => {
                    const count = coverage.offenseGood[t.id] ?? 0;
                    return (
                      <span
                        key={t.id}
                        class="px-1.5 py-0.5 text-[9px] border"
                        style={{
                          borderColor: count > 0 ? `${t.color}60` : '#3a3a5c30',
                          color: count > 0 ? t.color : '#444455',
                          background: count > 0 ? `${t.color}10` : 'transparent',
                        }}
                      >
                        {t.name} {count > 0 && `(${count})`}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div>
                <p class="text-[10px] text-pk-muted mb-1.5">약점 (2x 이상 받는 타입)</p>
                <div class="flex flex-wrap gap-1">
                  {types.filter(t => (coverage.defenseWeak[t.id] ?? 0) > 0).map(t => (
                    <span key={t.id} class="px-1.5 py-0.5 text-[9px] text-white" style={{ background: `${t.color}` }}>
                      {t.name} ({coverage.defenseWeak[t.id]})
                    </span>
                  ))}
                  {types.every(t => (coverage.defenseWeak[t.id] ?? 0) === 0) && (
                    <span class="text-[10px] text-pk-muted">없음</span>
                  )}
                </div>
              </div>
              <div>
                <p class="text-[10px] text-pk-muted mb-1.5">저항 (½x 이하 받는 타입)</p>
                <div class="flex flex-wrap gap-1">
                  {types.filter(t => (coverage.defenseResist[t.id] ?? 0) > 0).map(t => (
                    <span key={t.id} class="px-1.5 py-0.5 text-[9px] border" style={{ borderColor: `${t.color}40`, color: t.color }}>
                      {t.name} ({coverage.defenseResist[t.id]})
                    </span>
                  ))}
                  {types.every(t => (coverage.defenseResist[t.id] ?? 0) === 0) && (
                    <span class="text-[10px] text-pk-muted">없음</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Average stats */}
        <div class="pixel-card">
          <h3 class="text-sm text-pk-accent mb-3">팀 평균 스탯</h3>
          {avgStats ? (
            <div class="space-y-2">
              {(['hp','atk','def','spAtk','spDef','speed'] as const).map(key => {
                const labels: Record<string, string> = { hp:'HP', atk:'공격', def:'방어', spAtk:'특공', spDef:'특방', speed:'속도' };
                const val = avgStats[key];
                const pct = Math.min((val / 130) * 100, 100);
                return (
                  <div key={key} class="flex items-center gap-2 text-xs">
                    <span class="w-8 text-right text-pk-muted shrink-0">{labels[key]}</span>
                    <span class="w-7 text-right text-pk-text shrink-0">{val}</span>
                    <div class="flex-1 h-2 bg-pk-bg border border-pk-muted/20 overflow-hidden">
                      <div class="h-full bg-pk-accent/60 transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p class="text-xs text-pk-muted">크리처를 추가하면 평균 스탯을 표시합니다.</p>
          )}
        </div>
      </div>

      {/* Creature picker */}
      <div class="pixel-card">
        <h3 class="text-sm text-pk-accent mb-3">크리처 추가</h3>
        <div class="flex flex-wrap gap-2 mb-3">
          <input
            type="text"
            placeholder="이름 검색..."
            value={search}
            onInput={e => setSearch((e.target as HTMLInputElement).value)}
            class="bg-pk-bg border-2 border-pk-border px-3 py-1.5 text-xs text-pk-text outline-none focus:border-pk-accent transition-colors"
            style={{ minWidth: '140px' }}
          />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter((e.target as HTMLSelectElement).value)}
            class="bg-pk-bg border-2 border-pk-border px-2 py-1.5 text-xs text-pk-text outline-none focus:border-pk-accent"
            style={{  }}
          >
            <option value="">모든 타입</option>
            {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 max-h-[300px] overflow-y-auto">
          {filteredCreatures.map(c => {
            const isInTeam = team.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => !isInTeam && teamCount < 6 && addToTeam(c.id)}
                disabled={isInTeam || teamCount >= 6}
                class="p-1.5 text-center text-[10px] border border-pk-border/20 hover:border-pk-accent/40 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: isInTeam ? 'rgba(255,204,0,0.05)' : 'transparent' }}
              >
                <span class="text-pk-muted/50">#{String(c.id).padStart(3,'0')}</span>
                <p class="text-pk-text truncate">{c.name}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
