import { useState, useMemo } from 'preact/hooks';

interface TypeInfo { id: string; name: string; color: string; }
interface Skill {
  id: string; name: string; type: string;
  category: 'physical' | 'special' | 'status';
  power: number; accuracy: number; pp: number;
  effect: unknown; description: string;
}
interface CreatureBasic {
  id: number; name: string; type: string[];
  learnset: { level: number; skillId: string }[];
  uniqueSkill: { level: number; skillId: string } | null;
}
interface Props {
  skills: Skill[];
  types: TypeInfo[];
  creatures?: CreatureBasic[];
}

const catLabels: Record<string, string> = { physical: '물리', special: '특수', status: '변화' };
const catColors: Record<string, string> = { physical: '#FF4422', special: '#3399FF', status: '#44BB44' };

export default function SkillBrowser({ skills, types, creatures }: Props) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'power' | 'accuracy'>('power');
  const [page, setPage] = useState(0);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const perPage = 20;

  const typeMap = useMemo(() => {
    const m: Record<string, TypeInfo> = {};
    types.forEach(t => (m[t.id] = t));
    return m;
  }, [types]);

  // Build skill→creatures lookup
  const skillLearners = useMemo(() => {
    if (!creatures) return {};
    const map: Record<string, { id: number; name: string; level: number; isUnique: boolean }[]> = {};
    creatures.forEach(c => {
      c.learnset.forEach(ls => {
        if (!map[ls.skillId]) map[ls.skillId] = [];
        map[ls.skillId].push({ id: c.id, name: c.name, level: ls.level, isUnique: false });
      });
      if (c.uniqueSkill) {
        if (!map[c.uniqueSkill.skillId]) map[c.uniqueSkill.skillId] = [];
        map[c.uniqueSkill.skillId].push({ id: c.id, name: c.name, level: c.uniqueSkill.level, isUnique: true });
      }
    });
    return map;
  }, [creatures]);

  const filtered = useMemo(() => {
    let result = skills.filter(s => {
      if (search && !s.name.includes(search) && !s.id.includes(search.toLowerCase())) return false;
      if (typeFilter && s.type !== typeFilter) return false;
      if (catFilter && s.category !== catFilter) return false;
      return true;
    });
    result.sort((a, b) => {
      if (sortBy === 'power') return (b.power || 0) - (a.power || 0);
      if (sortBy === 'accuracy') return (b.accuracy || 0) - (a.accuracy || 0);
      return a.name.localeCompare(b.name);
    });
    return result;
  }, [skills, search, typeFilter, catFilter, sortBy]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);

  return (
    <div>
      {/* Filters */}
      <div class="flex flex-wrap gap-3 mb-5" role="search" aria-label="스킬 필터">
        <div>
          <label for="skill-search" class="sr-only">스킬 이름 검색</label>
          <input
            id="skill-search"
            type="text"
            placeholder="스킬 이름 검색..."
            value={search}
            onInput={(e) => { setSearch((e.target as HTMLInputElement).value); setPage(0); }}
            class="bg-pk-bg border-2 border-pk-border px-3 py-1.5 text-xs text-pk-text focus:border-pk-accent outline-none transition-colors"
            style={{ minWidth: '150px' }}
          />
        </div>

        <div>
          <label for="skill-type" class="sr-only">타입 필터</label>
          <select
            id="skill-type"
            value={typeFilter}
            onChange={(e) => { setTypeFilter((e.target as HTMLSelectElement).value); setPage(0); }}
            class="bg-pk-bg border-2 border-pk-border px-2 py-1.5 text-xs text-pk-text outline-none focus:border-pk-accent transition-colors"
            style={{  }}
          >
            <option value="">모든 타입</option>
            {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div>
          <label for="skill-cat" class="sr-only">분류 필터</label>
          <select
            id="skill-cat"
            value={catFilter}
            onChange={(e) => { setCatFilter((e.target as HTMLSelectElement).value); setPage(0); }}
            class="bg-pk-bg border-2 border-pk-border px-2 py-1.5 text-xs text-pk-text outline-none focus:border-pk-accent transition-colors"
            style={{  }}
          >
            <option value="">모든 분류</option>
            <option value="physical">물리</option>
            <option value="special">특수</option>
            <option value="status">변화</option>
          </select>
        </div>

        <div>
          <label for="skill-sort" class="sr-only">정렬</label>
          <select
            id="skill-sort"
            value={sortBy}
            onChange={(e) => setSortBy((e.target as HTMLSelectElement).value as typeof sortBy)}
            class="bg-pk-bg border-2 border-pk-border px-2 py-1.5 text-xs text-pk-text outline-none focus:border-pk-accent transition-colors"
            style={{  }}
          >
            <option value="power">위력순</option>
            <option value="accuracy">명중순</option>
            <option value="name">이름순</option>
          </select>
        </div>
      </div>

      <p class="text-[10px] text-pk-muted mb-3" aria-live="polite">{filtered.length}개 스킬</p>

      {/* Table */}
      <div class="overflow-x-auto">
        <table class="w-full text-xs" role="table">
          <thead>
            <tr class="border-b-2 border-pk-border/30">
              <th scope="col" class="text-left py-2 px-2 text-[10px] text-pk-muted uppercase tracking-wider">이름</th>
              <th scope="col" class="text-left py-2 px-2 text-[10px] text-pk-muted uppercase tracking-wider">타입</th>
              <th scope="col" class="text-left py-2 px-2 text-[10px] text-pk-muted uppercase tracking-wider">분류</th>
              <th scope="col" class="text-right py-2 px-2 text-[10px] text-pk-muted uppercase tracking-wider">위력</th>
              <th scope="col" class="text-right py-2 px-2 text-[10px] text-pk-muted uppercase tracking-wider">명중</th>
              <th scope="col" class="text-right py-2 px-2 text-[10px] text-pk-muted uppercase tracking-wider">PP</th>
              <th scope="col" class="text-left py-2 px-2 text-[10px] text-pk-muted uppercase tracking-wider hidden md:table-cell">설명</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(s => {
              const t = typeMap[s.type];
              const isExpanded = expandedSkill === s.id;
              const learners = skillLearners[s.id];
              return (
                <>
                  <tr
                    key={s.id}
                    class="border-b border-pk-border/10 hover:bg-pk-surface/30 transition-colors cursor-pointer"
                    onClick={() => setExpandedSkill(isExpanded ? null : s.id)}
                    style={isExpanded ? { background: `${t?.color ?? '#888'}08` } : {}}
                  >
                    <td class="py-1.5 px-2 text-pk-text">
                      {s.name}
                      {learners && <span class="text-pk-muted/40 text-[9px] ml-1">▾</span>}
                    </td>
                    <td class="py-1.5 px-2">
                      <span
                        class="inline-block px-1.5 py-0 text-[9px] text-white"
                        style={{ background: t?.color ?? '#888', textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}
                      >
                        {t?.name ?? s.type}
                      </span>
                    </td>
                    <td class="py-1.5 px-2" style={{ color: catColors[s.category] }}>
                      {catLabels[s.category]}
                    </td>
                    <td class="py-1.5 px-2 text-right text-pk-text">{s.power > 0 ? s.power : '—'}</td>
                    <td class="py-1.5 px-2 text-right text-pk-muted">{s.accuracy || '—'}</td>
                    <td class="py-1.5 px-2 text-right text-pk-muted">{s.pp}</td>
                    <td class="py-1.5 px-2 text-pk-muted hidden md:table-cell max-w-xs truncate">{s.description}</td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${s.id}-detail`}>
                      <td colSpan={7} class="p-3 bg-pk-surface/20 border-b border-pk-border/20">
                        <p class="text-xs text-pk-text-secondary mb-2">{s.description}</p>
                        {learners && learners.length > 0 && (
                          <div>
                            <p class="text-[10px] text-pk-muted mb-1.5">습득 크리처 ({learners.length}):</p>
                            <div class="flex flex-wrap gap-1">
                              {learners.sort((a, b) => a.level - b.level).map(l => (
                                <a
                                  key={l.id}
                                  href={`/creatures/${l.id}`}
                                  class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] border border-pk-border/30 hover:border-pk-accent/40 transition-colors"
                                >
                                  <span class="text-pk-muted">Lv.{l.level}</span>
                                  <span class="text-pk-text">{l.name}</span>
                                  {l.isUnique && <span class="text-pk-accent">★</span>}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav class="flex items-center justify-center gap-3 mt-5" aria-label="페이지 네비게이션">
          <button
            class="px-3 py-1.5 text-xs bg-pk-surface text-pk-text border border-pk-border/30 disabled:opacity-25 cursor-pointer hover:border-pk-border transition-colors"
            style={{  }}
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            aria-label="이전 페이지"
          >
            ◀ 이전
          </button>
          <span class="text-[10px] text-pk-muted" aria-current="page">
            {page + 1} / {totalPages}
          </span>
          <button
            class="px-3 py-1.5 text-xs bg-pk-surface text-pk-text border border-pk-border/30 disabled:opacity-25 cursor-pointer hover:border-pk-border transition-colors"
            style={{  }}
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            aria-label="다음 페이지"
          >
            다음 ▶
          </button>
        </nav>
      )}
    </div>
  );
}
