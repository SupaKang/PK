import { useState, useMemo } from 'preact/hooks';

interface GameMap {
  id: string; name: string; type: string; description: string;
  connections: string[]; requiredBadges: number;
  gym?: { leader: string; type: string; badge: string } | null;
}

interface Props {
  maps: GameMap[];
}

const typeConfig: Record<string, { color: string; label: string }> = {
  town: { color: '#3399FF', label: '마을' },
  route: { color: '#44BB44', label: '도로' },
  gym: { color: '#FF4422', label: '체육관' },
  cave: { color: '#BB8844', label: '동굴' },
  forest: { color: '#66BB66', label: '숲' },
  elite_four: { color: '#AA44CC', label: '리그' },
};

// Layout positions for a linear-ish world map
const layoutPositions: Record<string, { x: number; y: number }> = {
  town_01: { x: 60, y: 50 },
  route_01: { x: 140, y: 50 },
  town_02: { x: 220, y: 50 },
  gym_01: { x: 220, y: 110 },
  route_02: { x: 300, y: 50 },
  cave_01: { x: 300, y: 110 },
  town_03: { x: 380, y: 50 },
  gym_02: { x: 380, y: 110 },
  route_03: { x: 460, y: 50 },
  town_04: { x: 540, y: 50 },
  gym_03: { x: 540, y: 110 },
  route_04: { x: 620, y: 50 },
  forest_01: { x: 620, y: 110 },
  town_05: { x: 700, y: 50 },
  gym_04: { x: 700, y: 110 },
  route_05: { x: 700, y: 170 },
  town_06: { x: 620, y: 170 },
  gym_05: { x: 620, y: 230 },
  route_06: { x: 540, y: 170 },
  cave_02: { x: 540, y: 230 },
  town_07: { x: 460, y: 170 },
  gym_06: { x: 460, y: 230 },
  route_07: { x: 380, y: 170 },
  town_08: { x: 300, y: 170 },
  gym_07: { x: 300, y: 230 },
  route_08: { x: 220, y: 170 },
  shadow_base: { x: 220, y: 230 },
  town_09: { x: 140, y: 170 },
  gym_08: { x: 140, y: 230 },
  route_09: { x: 60, y: 170 },
  elite_four: { x: 60, y: 230 },
};

export default function WorldMapInteractive({ maps }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [badgeFilter, setBadgeFilter] = useState<number>(-1);

  const mapById = useMemo(() => {
    const m: Record<string, GameMap> = {};
    maps.forEach(loc => (m[loc.id] = loc));
    return m;
  }, [maps]);

  const selectedMap = selected ? mapById[selected] : null;

  const svgW = 780;
  const svgH = 280;
  const nodeR = 14;

  // Draw connections
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const seen = new Set<string>();
  maps.forEach(loc => {
    loc.connections.forEach(connId => {
      const key = [loc.id, connId].sort().join('|');
      if (seen.has(key)) return;
      seen.add(key);
      const p1 = layoutPositions[loc.id];
      const p2 = layoutPositions[connId];
      if (p1 && p2) edges.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
    });
  });

  return (
    <div>
      {/* Badge filter */}
      <div class="flex items-center gap-2 mb-4 flex-wrap">
        <span class="text-[10px] text-pk-muted">배지 필터:</span>
        <button
          class="px-2 py-0.5 text-[10px] border cursor-pointer transition-all"
          style={{
            fontFamily: 'inherit',
            borderColor: badgeFilter === -1 ? '#FFCC00' : '#3a3a5c',
            color: badgeFilter === -1 ? '#FFCC00' : '#9999bb',
            background: badgeFilter === -1 ? 'rgba(255,204,0,0.08)' : 'transparent',
          }}
          onClick={() => setBadgeFilter(-1)}
        >
          전체
        </button>
        {[0,1,2,3,4,5,6,7,8].map(b => (
          <button
            key={b}
            class="px-2 py-0.5 text-[10px] border cursor-pointer transition-all"
            style={{
              fontFamily: 'inherit',
              borderColor: badgeFilter === b ? '#FFCC00' : '#3a3a5c',
              color: badgeFilter === b ? '#FFCC00' : '#9999bb',
              background: badgeFilter === b ? 'rgba(255,204,0,0.08)' : 'transparent',
            }}
            onClick={() => setBadgeFilter(b)}
          >
            {b}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div class="flex flex-wrap gap-3 mb-4">
        {Object.entries(typeConfig).map(([type, cfg]) => (
          <span key={type} class="flex items-center gap-1 text-[9px] text-pk-muted">
            <span class="w-3 h-3 border-2" style={{ borderColor: cfg.color, background: `${cfg.color}20` }} />
            {cfg.label}
          </span>
        ))}
      </div>

      {/* SVG Map */}
      <div class="overflow-x-auto pb-2">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} width={svgW} height={svgH} class="max-w-full min-w-[600px]" style={{ background: 'rgba(0,0,0,0.15)' }}>
          {/* Edges */}
          {edges.map((e, i) => (
            <line
              key={i}
              x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke="rgba(136,136,170,0.2)"
              stroke-width="2"
              stroke-dasharray="4,4"
            />
          ))}

          {/* Nodes */}
          {maps.map(loc => {
            const pos = layoutPositions[loc.id];
            if (!pos) return null;
            const cfg = typeConfig[loc.type] || { color: '#888', label: '?' };
            const isSelected = selected === loc.id;
            const isFiltered = badgeFilter >= 0 && loc.requiredBadges !== badgeFilter;
            const isConnected = selectedMap?.connections.includes(loc.id) || (selected && loc.connections.includes(selected));

            return (
              <g
                key={loc.id}
                onClick={() => setSelected(isSelected ? null : loc.id)}
                style={{ cursor: 'pointer', opacity: isFiltered ? 0.15 : 1, transition: 'opacity 0.2s' }}
              >
                {/* Glow for selected */}
                {isSelected && (
                  <circle cx={pos.x} cy={pos.y} r={nodeR + 4} fill="none" stroke={cfg.color} stroke-width="1" opacity="0.4">
                    <animate attributeName="r" from={nodeR + 2} to={nodeR + 6} dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.4" to="0" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* Connection highlight */}
                {isConnected && !isSelected && (
                  <circle cx={pos.x} cy={pos.y} r={nodeR + 2} fill="none" stroke={cfg.color} stroke-width="1" opacity="0.3" />
                )}
                {/* Node */}
                <rect
                  x={pos.x - nodeR} y={pos.y - nodeR}
                  width={nodeR * 2} height={nodeR * 2}
                  fill={isSelected ? cfg.color : `${cfg.color}30`}
                  stroke={cfg.color}
                  stroke-width={isSelected ? 2 : 1.5}
                />
                {/* Badge number */}
                <text
                  x={pos.x} y={pos.y + 1}
                  text-anchor="middle" dominant-baseline="middle"
                  fill={isSelected ? '#0f0f1a' : cfg.color}
                  font-size="8" font-family="inherit"
                >
                  {loc.gym ? '★' : loc.requiredBadges}
                </text>
                {/* Name label */}
                <text
                  x={pos.x} y={pos.y - nodeR - 4}
                  text-anchor="middle" dominant-baseline="auto"
                  fill={isSelected ? '#e8e8f0' : '#8888aa'}
                  font-size="7" font-family="inherit"
                >
                  {loc.name.length > 6 ? loc.name.slice(0, 5) + '..' : loc.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Detail panel */}
      {selectedMap && (
        <div class="pixel-card mt-4" style={{ borderColor: `${typeConfig[selectedMap.type]?.color ?? '#888'}40` }}>
          <div class="flex items-center gap-3 mb-3">
            <span class="px-2 py-0.5 text-[10px] text-white" style={{ background: typeConfig[selectedMap.type]?.color ?? '#888' }}>
              {typeConfig[selectedMap.type]?.label ?? selectedMap.type}
            </span>
            <h3 class="text-sm text-pk-text">{selectedMap.name}</h3>
            {selectedMap.requiredBadges > 0 && (
              <span class="text-[9px] text-pk-muted">배지 {selectedMap.requiredBadges}개 필요</span>
            )}
          </div>
          <p class="text-xs text-pk-text-secondary mb-3">{selectedMap.description}</p>
          {selectedMap.gym && (
            <div class="flex items-center gap-2 text-xs">
              <span class="text-pk-accent">★</span>
              <span class="text-pk-text">{selectedMap.gym.leader}</span>
              <span class="text-pk-muted">({selectedMap.gym.badge})</span>
            </div>
          )}
          <div class="mt-2 flex gap-1.5 text-[9px]">
            <span class="text-pk-muted">연결:</span>
            {selectedMap.connections.map(connId => {
              const conn = mapById[connId];
              return conn ? (
                <button
                  key={connId}
                  class="text-pk-text-secondary hover:text-pk-accent cursor-pointer transition-colors"
                  style={{ fontFamily: 'inherit' }}
                  onClick={() => setSelected(connId)}
                >
                  {conn.name}
                </button>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
