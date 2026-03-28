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

  const getCellStyle = (value: number) => {
    if (value === 0) return { bg: '#0a0a12', text: '#444', label: '0' };
    if (value === 0.5) return { bg: '#2a1515', text: '#ff8888', label: '½' };
    if (value === 2) return { bg: '#152a15', text: '#88ff88', label: '2' };
    return { bg: 'transparent', text: '#555', label: '' };
  };

  return (
    <div role="region" aria-label="타입 상성 매트릭스">
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
                  return (
                    <td
                      key={def.id}
                      class="text-center text-[10px] font-bold"
                      style={{
                        background: cell.bg,
                        color: cell.text,
                        padding: '3px',
                        minWidth: '26px',
                        opacity: selected && !isHL ? 0.15 : 1,
                        transition: 'opacity 0.15s',
                        border: '1px solid rgba(255,255,255,0.03)',
                      }}
                      aria-label={`${atk.name} → ${def.name}: ${value}x`}
                    >
                      {cell.label}
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
          <span class="w-4 h-2.5 inline-block" style={{ background: '#152a15' }} aria-hidden="true" />
          2x 효과적
        </span>
        <span role="listitem" class="flex items-center gap-1.5">
          <span class="w-4 h-2.5 inline-block" style={{ background: '#2a1515' }} aria-hidden="true" />
          ½x 별로
        </span>
        <span role="listitem" class="flex items-center gap-1.5">
          <span class="w-4 h-2.5 inline-block" style={{ background: '#0a0a12' }} aria-hidden="true" />
          0x 무효
        </span>
        {selected && (
          <button
            class="text-pk-accent underline cursor-pointer ml-auto"
            onClick={() => setSelected(null)}
            style={{ fontFamily: 'inherit' }}
          >
            필터 해제
          </button>
        )}
      </div>
    </div>
  );
}
