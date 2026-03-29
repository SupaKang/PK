import { useEffect } from 'preact/hooks';
import StatRadar from './StatRadar';
import StatBars from './StatBars';
import EvolutionTree from './EvolutionTree';

interface BaseStats {
  hp: number; atk: number; def: number; spAtk: number; spDef: number; speed: number;
}
interface Creature {
  id: number; name: string; type: string[]; baseStats: BaseStats;
  growthRate: string; evolution: { to: number; level: number } | null;
  catchRate: number; expYield: number;
  learnset: { level: number; skillId: string }[];
  uniqueSkill: { level: number; skillId: string } | null;
  description: string;
  spriteConfig: { baseColor: string; accentColor: string; shape: string; features: string[] };
}
interface TypeInfo { id: string; name: string; color: string; }
interface Skill {
  id: string; name: string; type: string; category: string;
  power: number; accuracy: number; pp: number; description: string;
}

interface Props {
  creature: Creature;
  typeMap: Record<string, TypeInfo>;
  skillMap: Record<string, Skill>;
  chain: Creature[];
  onClose: () => void;
}

export default function CreatureDetail({ creature, typeMap, skillMap, chain, onClose }: Props) {
  const primaryColor = typeMap[creature.type[0]]?.color ?? '#888';

  // Lock body scroll and handle Escape
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', animation: 'fade-in 0.15s ease-out' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`${creature.name} 상세 정보`}
    >
      <div
        class="bg-pk-bg w-full max-w-3xl max-h-[90vh] overflow-y-auto border-2 border-pk-border"
        style={{
          boxShadow: `6px 6px 0 rgba(0,0,0,0.9), 0 0 30px ${primaryColor}15`,
          animation: 'scale-in 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div class="flex items-center justify-between p-5 border-b border-pk-border/30 sticky top-0 bg-pk-bg/95 backdrop-blur-sm z-10"
             style={{ background: `linear-gradient(135deg, ${primaryColor}08, transparent)` }}>
          <div>
            <span class="text-[10px] text-pk-muted tracking-wider">#{String(creature.id).padStart(3, '0')}</span>
            <h2 class="text-xl leading-tight" style={{ color: primaryColor }}>{creature.name}</h2>
            <div class="flex gap-1 mt-1.5">
              {creature.type.map(t => (
                <span
                  key={t}
                  class="px-2 py-0.5 text-[10px] text-white"
                  style={{ background: typeMap[t]?.color ?? '#888', textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}
                >
                  {typeMap[t]?.name ?? t}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            class="text-pk-muted text-sm cursor-pointer hover:text-pk-text p-2 border border-pk-border/30 hover:border-pk-border transition-colors"
            style={{  }}
            aria-label="닫기"
          >
            ESC
          </button>
        </div>

        <div class="p-5 space-y-6">
          {/* Description */}
          <p class="text-sm text-pk-text-secondary leading-relaxed">{creature.description}</p>

          {/* Stats */}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <h3 class="text-sm text-pk-accent mb-3">기본 스탯</h3>
              <StatBars stats={creature.baseStats} color={primaryColor} />
            </div>
            <div class="flex items-center justify-center">
              <StatRadar stats={creature.baseStats} color={primaryColor} />
            </div>
          </div>

          {/* Info row */}
          <div class="grid grid-cols-3 gap-3 text-center">
            {[
              { label: '포획률', value: creature.catchRate },
              { label: '경험치', value: creature.expYield },
              { label: '성장률', value: creature.growthRate },
            ].map(info => (
              <div key={info.label} class="bg-pk-surface p-3 border border-pk-border/20">
                <p class="text-pk-muted text-[10px] uppercase tracking-wider">{info.label}</p>
                <p class="text-pk-text text-sm mt-0.5">{info.value}</p>
              </div>
            ))}
          </div>

          {/* Evolution chain */}
          {chain.length > 1 && (
            <div>
              <h3 class="text-sm text-pk-accent mb-3">진화 트리</h3>
              <EvolutionTree chain={chain} typeMap={typeMap} currentId={creature.id} />
            </div>
          )}

          {/* Learnset */}
          <div>
            <h3 class="text-sm text-pk-accent mb-3">
              습득 스킬
              <span class="text-pk-muted text-[10px] ml-2">
                ({creature.learnset.length + (creature.uniqueSkill ? 1 : 0)})
              </span>
            </h3>
            <div class="overflow-x-auto">
              <table class="w-full text-xs" role="table">
                <thead>
                  <tr class="border-b border-pk-border/30">
                    <th scope="col" class="text-left py-1.5 px-2 text-[10px] text-pk-muted uppercase">Lv</th>
                    <th scope="col" class="text-left py-1.5 px-2 text-[10px] text-pk-muted uppercase">이름</th>
                    <th scope="col" class="text-left py-1.5 px-2 text-[10px] text-pk-muted uppercase">타입</th>
                    <th scope="col" class="text-left py-1.5 px-2 text-[10px] text-pk-muted uppercase">분류</th>
                    <th scope="col" class="text-right py-1.5 px-2 text-[10px] text-pk-muted uppercase">위력</th>
                    <th scope="col" class="text-right py-1.5 px-2 text-[10px] text-pk-muted uppercase">명중</th>
                  </tr>
                </thead>
                <tbody>
                  {[...creature.learnset, ...(creature.uniqueSkill ? [creature.uniqueSkill] : [])].map(ls => {
                    const s = skillMap[ls.skillId];
                    if (!s) return null;
                    const isUnique = creature.uniqueSkill?.skillId === ls.skillId;
                    return (
                      <tr key={ls.skillId} class="border-b border-pk-border/10 hover:bg-pk-surface/30 transition-colors" style={isUnique ? { background: `${primaryColor}08` } : {}}>
                        <td class="py-1.5 px-2 text-pk-muted">{ls.level}</td>
                        <td class="py-1.5 px-2 text-pk-text">
                          {s.name}
                          {isUnique && <span class="ml-1 text-[9px]" style={{ color: primaryColor }} aria-label="고유 스킬">★</span>}
                        </td>
                        <td class="py-1.5 px-2">
                          <span class="px-1 py-0 text-[8px] text-white" style={{ background: typeMap[s.type]?.color ?? '#888' }}>
                            {typeMap[s.type]?.name ?? s.type}
                          </span>
                        </td>
                        <td class="py-1.5 px-2 text-pk-muted">
                          {s.category === 'physical' ? '물리' : s.category === 'special' ? '특수' : '변화'}
                        </td>
                        <td class="py-1.5 px-2 text-right text-pk-text">{s.power || '—'}</td>
                        <td class="py-1.5 px-2 text-right text-pk-muted">{s.accuracy || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
