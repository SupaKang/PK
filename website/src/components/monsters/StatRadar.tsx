interface Props {
  stats: { hp: number; atk: number; def: number; spAtk: number; spDef: number; speed: number };
  color: string;
}

const labels = ['HP', '공격', '방어', '특공', '특방', '속도'];
const keys = ['hp', 'atk', 'def', 'spAtk', 'spDef', 'speed'] as const;

export default function StatRadar({ stats, color }: Props) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const maxVal = 130;
  const radius = 75;

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
    const r = (value / maxVal) * radius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  // Background hexagons
  const bgLevels = [0.25, 0.5, 0.75, 1.0];
  const bgPaths = bgLevels.map(level => {
    const points = Array.from({ length: 6 }, (_, i) => {
      const p = getPoint(i, maxVal * level);
      return `${p.x},${p.y}`;
    });
    return points.join(' ');
  });

  // Stat polygon
  const statPoints = keys.map((key, i) => {
    const p = getPoint(i, stats[key]);
    return `${p.x},${p.y}`;
  }).join(' ');

  // Label positions
  const labelPositions = labels.map((_, i) => {
    const p = getPoint(i, maxVal * 1.2);
    return p;
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} class="max-w-full">
      {/* Background grid */}
      {bgPaths.map((points, i) => (
        <polygon
          key={i}
          points={points}
          fill="none"
          stroke="rgba(136,136,170,0.2)"
          stroke-width="1"
        />
      ))}

      {/* Axes */}
      {Array.from({ length: 6 }, (_, i) => {
        const p = getPoint(i, maxVal);
        return (
          <line
            key={i}
            x1={cx} y1={cy} x2={p.x} y2={p.y}
            stroke="rgba(136,136,170,0.15)"
            stroke-width="1"
          />
        );
      })}

      {/* Stat fill */}
      <polygon
        points={statPoints}
        fill={`${color}30`}
        stroke={color}
        stroke-width="2"
      />

      {/* Stat dots */}
      {keys.map((key, i) => {
        const p = getPoint(i, stats[key]);
        return <circle key={key} cx={p.x} cy={p.y} r="3" fill={color} />;
      })}

      {/* Labels */}
      {labels.map((label, i) => (
        <text
          key={label}
          x={labelPositions[i].x}
          y={labelPositions[i].y}
          text-anchor="middle"
          dominant-baseline="middle"
          fill="#8888aa"
          font-size="9"
          font-family="inherit"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}
