import { useState, useMemo } from 'preact/hooks';
import MonsterCard from './MonsterCard';
import MonsterDetail from './MonsterDetail';

interface BaseStats {
  hp: number; atk: number; def: number; spAtk: number; spDef: number; speed: number;
}
interface Monster {
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
  monsters: Monster[];
  types: TypeInfo[];
  skills: Skill[];
}

function getStatTotal(s: BaseStats) {
  return s.hp + s.atk + s.def + s.spAtk + s.spDef + s.speed;
}

export default function MonsterDex({ monsters, types, skills }: Props) {
  const [search, setSearch] = useState('');
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'id' | 'name' | 'stat'>('id');
  const [selected, setSelected] = useState<Monster | null>(null);

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
    let result = monsters.filter(m => {
      if (search && !m.name.includes(search)) return false;
      if (typeFilters.size > 0 && !m.type.some(t => typeFilters.has(t))) return false;
      return true;
    });
    result.sort((a, b) => {
      if (sortBy === 'id') return a.id - b.id;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return getStatTotal(b.baseStats) - getStatTotal(a.baseStats);
    });
    return result;
  }, [monsters, search, typeFilters, sortBy]);

  const toggleType = (typeId: string) => {
    setTypeFilters(prev => {
      const next = new Set(prev);
      if (next.has(typeId)) next.delete(typeId);
      else next.add(typeId);
      return next;
    });
  };

  const getChain = (monster: Monster) => {
    const chain: Monster[] = [];
    let rootId = monster.id;
    let found = true;
    while (found) {
      found = false;
      for (const m of monsters) {
        if (m.evolution?.to === rootId) { rootId = m.id; found = true; break; }
      }
    }
    let cur: Monster | undefined = monsters.find(m => m.id === rootId);
    while (cur) {
      chain.push(cur);
      if (cur.evolution) cur = monsters.find(m => m.id === cur!.evolution!.to);
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
      <div class="mb-8" role="search" aria-label="몬스터 검색">
        <label for="monster-search" class="sr-only">몬스터 이름 검색</label>
        <input
          id="monster-search"
          type="text"
          placeholder="몬스터 이름 검색..."
          value={search}
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
          class="w-full bg-pk-bg border-2 border-pk-border px-4 py-2.5 text-sm text-pk-text focus:border-pk-accent outline-none transition-colors"
          style={{ fontFamily: 'inherit' }}
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
                  fontFamily: 'inherit',
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
                style={{ fontFamily: 'inherit' }}
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
              style={{ fontFamily: 'inherit' }}
            >
              <option value="id">도감번호순</option>
              <option value="name">이름순</option>
              <option value="stat">총스탯순</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3" role="list" aria-label="몬스터 목록">
        {filtered.map(m => (
          <MonsterCard
            key={m.id}
            monster={m}
            typeMap={typeMap}
            onClick={() => setSelected(m)}
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
        <MonsterDetail
          monster={selected}
          typeMap={typeMap}
          skillMap={skillMap}
          chain={getChain(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
