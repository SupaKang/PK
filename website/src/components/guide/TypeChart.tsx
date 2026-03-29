import { useState } from 'preact/hooks';

interface TypeInfo {
  id: string;
  name: string;
  color: string;
}

interface Props {
  types: TypeInfo[];
  matchups: Record<string, Record<string, number>>;
}

export default function TypeChart({ types, matchups }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ atk: string; def: string } | null>(null);
  const [dualType, setDualType] = useState<[string, string] | null>(null);
  const [showDualCalc, setShowDualCalc] = useState(false);

  const getCellStyle = (value: number) => {
    if (value === 0) return { bg: '#0a0a18', text: '#555566', label: '0', border: '#1a1a2a' };
    if (value === 0.5) return { bg: '#2a1215', text: '#ff7777', label: '½', border: '#3a1a1d' };
    if (value === 2) return { bg: '#122a15', text: '#77ff88', label: '2', border: '#1a3a1d' };
    return { bg: 'transparent', text: '#444455', label: '', border: 'rgba(255,255,255,0.03)' };
  };

  // Dual-type calculator
  const getDualEffectiveness = (atkType: string) => {
    if (!dualType) return 1;
    const v1 = matchups[atkType]?.[dualType[0]] ?? 1;
    const v2 = matchups[atkType]?.[dualType[1]] ?? 1;
    return v1 * v2;
  };

  const dualCellStyle = (value: number) => {
    if (value === 0) return { bg: '#0a0a18', text: '#555566', label: '0x' };
    if (value === 0.25) return { bg: '#2a0a0a', text: '#ff5555', label: '¼x' };
    if (value === 0.5) return { bg: '#2a1215', text: '#ff7777', label: '½x' };
    if (value === 4) return { bg: '#0a3a0a', text: '#44ff66', label: '4x' };
    if (value === 2) return { bg: '#122a15', text: '#77ff88', label: '2x' };
    return { bg: 'transparent', text: '#666677', label: '1x' };
  };

  return (
    <div role="region" aria-label="타입 상성 매트릭스">
      {/* Dual-type calculator toggle */}
      <div class="mb-4 flex items-center gap-3">
        <button
          class="text-[10px] px-3 py-1.5 border-2 cursor-pointer transition-all"
          style={{
            borderColor: showDualCalc ? '#FFCC00' : '#3a3a5c',
            color: showDualCalc ? '#FFCC00' : '#9999bb',
            background: showDualCalc ? 'rgba(255,204,0,0.08)' : 'transparent',
          }}
          onClick={() => { setShowDualCalc(!showDualCalc); setDualType(null); }}
        >
          {showDualCalc ? '이중타입 계산기 ON' : '이중타입 계산기'}
        </button>
        {showDualCalc && dualType && (
          <span class="text-[10px] text-pk-muted">
            방어: {types.find(t => t.id === dualType[0])?.name}/{types.find(t => t.id === dualType[1])?.name}
          </span>
        )}
      </div>

      {/* Dual-type selector */}
      {showDualCalc && (
        <div class="mb-5 p-3 bg-pk-surface border border-pk-border/30">
          <p class="text-[10px] text-pk-muted mb-2">방어 타입 2개를 선택하세요:</p>
          <div class="flex flex-wrap gap-1">
            {types.map(t => {
              const isSelected = dualType?.includes(t.id);
              return (
                <button
                  key={t.id}
                  class="px-1.5 py-0.5 text-[9px] border cursor-pointer transition-all"
                  style={{
                    background: isSelected ? t.color : 'transparent',
                    borderColor: isSelected ? t.color : `${t.color}40`,
                    color: isSelected ? '#fff' : t.color,
                    textShadow: isSelected ? '1px 1px 0 rgba(0,0,0,0.5)' : 'none',
                  }}
                  onClick={() => {
                    if (!dualType) setDualType([t.id, t.id]);
                    else if (dualType[0] === t.id && dualType[1] === t.id) setDualType(null);
                    else if (isSelected) setDualType([dualType.find(d => d !== t.id) || t.id, dualType.find(d => d !== t.id) || t.id]);
                    else setDualType([dualType[0], t.id]);
                  }}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
          {dualType && (
            <div class="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-1">
              {types.map(atk => {
                const eff = getDualEffectiveness(atk.id);
                const style = dualCellStyle(eff);
                if (eff === 1) return null;
                return (
                  <div key={atk.id} class="text-center p-1 text-[9px]" style={{ background: style.bg }}>
                    <span style={{ color: atk.color }}>{atk.name}</span>
                    <span class="block font-bold" style={{ color: style.text }}>{style.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main chart */}
      <div class="overflow-x-auto pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
        <table class="border-collapse" style={{ minWidth: '580px' }} role="grid" aria-label="18타입 상성표">
          <thead>
            <tr>
              <th class="p-1 text-[9px] text-pk-muted" style={{ minWidth: '44px' }} scope="col">
                <span aria-label="공격 타입(세로) 대 방어 타입(가로)">공↓방→</span>
              </th>
              {types.map(def => (
                <th
                  key={def.id}
                  scope="col"
                  class="p-0.5 cursor-pointer"
                  style={{ opacity: selected && selected !== def.id ? 0.35 : 1, transition: 'opacity 0.15s' }}
                  onClick={() => setSelected(selected === def.id ? null : def.id)}
                >
                  <span
                    class="inline-block px-1 py-0.5 text-[9px] text-white"
                    style={{
                      background: def.color,
                      textShadow: '1px 1px 0 rgba(0,0,0,0.6)',
                      minWidth: '26px',
                      textAlign: 'center',
                      boxShadow: selected === def.id ? `0 0 6px ${def.color}` : 'none',
                    }}
                  >
                    {def.name.slice(0, 2)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {types.map(atk => (
              <tr
                key={atk.id}
                style={{
                  opacity: selected && selected !== atk.id ? 0.35 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                <th
                  scope="row"
                  class="p-0.5 cursor-pointer text-left"
                  onClick={() => setSelected(selected === atk.id ? null : atk.id)}
                >
                  <span
                    class="inline-block px-1 py-0.5 text-[9px] text-white"
                    style={{
                      background: atk.color,
                      textShadow: '1px 1px 0 rgba(0,0,0,0.6)',
                      minWidth: '36px',
                      boxShadow: selected === atk.id ? `0 0 6px ${atk.color}` : 'none',
                    }}
                  >
                    {atk.name}
                  </span>
                </th>
                {types.map(def => {
                  const value = matchups[atk.id]?.[def.id] ?? 1;
                  const cell = getCellStyle(value);
                  const isHL = selected === atk.id || selected === def.id;
                  const isHovered = hoveredCell?.atk === atk.id && hoveredCell?.def === def.id;
                  return (
                    <td
                      key={def.id}
                      class="text-center text-[10px] font-bold relative"
                      style={{
                        background: isHovered ? `${cell.bg === 'transparent' ? '#1a1a30' : cell.bg}` : cell.bg,
                        color: cell.text,
                        padding: '3px',
                        minWidth: '26px',
                        opacity: selected && !isHL ? 0.15 : 1,
                        transition: 'opacity 0.15s',
                        border: `1px solid ${isHovered ? '#5a5a8c' : cell.border}`,
                        cursor: 'default',
                      }}
                      aria-label={`${atk.name} → ${def.name}: ${value}x`}
                      onMouseEnter={() => setHoveredCell({ atk: atk.id, def: def.id })}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      {cell.label}
                      {/* Hover tooltip */}
                      {isHovered && value !== 1 && (
                        <div
                          class="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-[9px] whitespace-nowrap pointer-events-none"
                          style={{
                            background: '#1a1a30',
                            border: '1px solid #3a3a5c',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
                            color: '#e8e8f0',
                          }}
                        >
                          <span style={{ color: atk.color }}>{atk.name}</span>
                          {' → '}
                          <span style={{ color: def.color }}>{def.name}</span>
                          {': '}
                          <strong style={{ color: cell.text }}>{value}x</strong>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div class="flex flex-wrap items-center gap-4 mt-4 text-[10px] text-pk-muted" role="list" aria-label="범례">
        <span role="listitem" class="flex items-center gap-1.5">
          <span class="w-4 h-2.5 inline-block" style={{ background: '#122a15', border: '1px solid #1a3a1d' }} aria-hidden="true" />
          2x 효과적
        </span>
        <span role="listitem" class="flex items-center gap-1.5">
          <span class="w-4 h-2.5 inline-block" style={{ background: '#2a1215', border: '1px solid #3a1a1d' }} aria-hidden="true" />
          ½x 별로
        </span>
        <span role="listitem" class="flex items-center gap-1.5">
          <span class="w-4 h-2.5 inline-block" style={{ background: '#0a0a18', border: '1px solid #1a1a2a' }} aria-hidden="true" />
          0x 무효
        </span>
        {selected && (
          <button
            class="text-pk-accent underline cursor-pointer ml-auto"
            onClick={() => setSelected(null)}
            style={{  }}
          >
            필터 해제
          </button>
        )}
      </div>
    </div>
  );
}
