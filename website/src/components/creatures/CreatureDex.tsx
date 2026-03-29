import { useState, useMemo } from 'preact/hooks';
import CreatureCard from './CreatureCard';
import CreatureDetail from './CreatureDetail';

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
  creatures: Creature[];
  types: TypeInfo[];
  skills: Skill[];
  spriteMap?: Record<number, string | null>;
}

function getStatTotal(s: BaseStats) {
  return s.hp + s.atk + s.def + s.spAtk + s.spDef + s.speed;
}

export default function CreatureDex({ creatures, types, skills, spriteMap }: Props) {
  const getSpriteUrl = (id: number): string | null => {
    if (!spriteMap) return null;
    const name = spriteMap[id];
    return name ? `/sprites/creatures/${name}.png` : null;
  };
  const [search, setSearch] = useState('');
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'id' | 'name' | 'stat'>('id');
  const [selected, setSelected] = useState<Creature | null>(null);

  const typeMap = useMemo(() => {
    const m: Record<string, TypeInfo> = {};
    types.forEach(t => (m[t.id] = t));
    return m;
  }, [types]);

  const skillMap = useMemo(() => {
    const m: Record<string, Skill> = {};
    skills.forEach(s => (m[s.id] = s));
    return m;
  }, [skills]);

  const filtered = useMemo(() => {
    let result = creatures.filter(c => {
      if (search && !c.name.includes(search)) return false;
      if (typeFilters.size > 0 && !c.type.some(t => typeFilters.has(t))) return false;
      return true;
    });
    result.sort((a, b) => {
      if (sortBy === 'id') return a.id - b.id;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return getStatTotal(b.baseStats) - getStatTotal(a.baseStats);
    });
    return result;
  }, [creatures, search, typeFilters, sortBy]);

  const toggleType = (typeId: string) => {
    setTypeFilters(prev => {
      const next = new Set(prev);
      if (next.has(typeId)) next.delete(typeId);
      else next.add(typeId);
      return next;
    });
  };

  const getChain = (creature: Creature) => {
    const chain: Creature[] = [];
    let rootId = creature.id;
    let found = true;
    while (found) {
      found = false;
      for (const c of creatures) {
        if (c.evolution?.to === rootId) { rootId = c.id; found = true; break; }
      }
    }
    let cur: Creature | undefined = creatures.find(c => c.id === rootId);
    while (cur) {
      chain.push(cur);
      if (cur.evolution) cur = creatures.find(c => c.id === cur!.evolution!.to);
      else break;
    }
    return chain;
  };

  // Close modal on Escape
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && selected) setSelected(null);
  };

  return (
    <div onKeyDown={handleKeyDown}>
      {/* Search & filters */}
      <div class="mb-8" role="search" aria-label="크리처 검색">
        <label for="creature-search" class="sr-only">크리처 이름 검색</label>
        <input
          id="creature-search"
          type="text"
          placeholder="크리처 이름 검색..."
          value={search}
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
          class="w-full bg-pk-bg border-2 border-pk-border px-4 py-2.5 text-sm text-pk-text focus:border-pk-accent outline-none transition-colors"
          style={{  }}
        />

        {/* Type filter buttons */}
        <fieldset class="mt-4 mb-4">
          <legend class="sr-only">타입 필터</legend>
          <div class="flex flex-wrap gap-1.5">
            {types.map(t => (
              <button
                key={t.id}
                onClick={() => toggleType(t.id)}
                aria-pressed={typeFilters.has(t.id)}
                class="px-2 py-1 text-[10px] border-2 cursor-pointer transition-all"
                style={{
                  background: typeFilters.has(t.id) ? t.color : 'transparent',
                  borderColor: typeFilters.has(t.id) ? t.color : `${t.color}40`,
                  color: typeFilters.has(t.id) ? '#fff' : t.color,
                  opacity: typeFilters.size > 0 && !typeFilters.has(t.id) ? 0.5 : 1,
                  textShadow: typeFilters.has(t.id) ? '1px 1px 0 rgba(0,0,0,0.5)' : 'none',
                  boxShadow: typeFilters.has(t.id) ? `0 0 8px ${t.color}40` : 'none',
                }}
              >
                {t.name}
              </button>
            ))}
            {typeFilters.size > 0 && (
              <button
                onClick={() => setTypeFilters(new Set())}
                class="px-2 py-1 text-[10px] text-pk-muted border border-pk-border cursor-pointer hover:text-pk-text transition-colors"
                style={{  }}
              >
                초기화
              </button>
            )}
          </div>
        </fieldset>

        {/* Sort + count */}
        <div class="flex items-center justify-between">
          <span class="text-xs text-pk-muted" aria-live="polite">{filtered.length}종 표시</span>
          <div>
            <label for="sort-select" class="sr-only">정렬 기준</label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy((e.target as HTMLSelectElement).value as typeof sortBy)}
              class="bg-pk-bg border border-pk-border px-2 py-1 text-xs text-pk-text outline-none focus:border-pk-accent transition-colors"
              style={{  }}
            >
              <option value="id">도감번호순</option>
              <option value="name">이름순</option>
              <option value="stat">총스탯순</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3" role="list" aria-label="크리처 목록">
        {filtered.map(c => (
          <CreatureCard
            key={c.id}
            creature={c}
            typeMap={typeMap}
            onClick={() => setSelected(c)}
            spriteUrl={getSpriteUrl(c.id)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div class="text-center py-20 text-pk-muted text-sm" role="status">
          검색 결과가 없습니다.
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <CreatureDetail
          creature={selected}
          typeMap={typeMap}
          skillMap={skillMap}
          chain={getChain(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
