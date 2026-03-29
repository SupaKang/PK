interface BaseStats {
  hp: number; atk: number; def: number; spAtk: number; spDef: number; speed: number;
}

interface Creature {
  id: number; name: string; type: string[]; baseStats: BaseStats;
  spriteConfig: { baseColor: string; accentColor: string; shape: string; features: string[] };
}

interface TypeInfo { id: string; name: string; color: string; }

interface Props {
  creature: Creature;
  typeMap: Record<string, TypeInfo>;
  onClick: () => void;
  spriteUrl?: string | null;
}

function getStatTotal(s: BaseStats) {
  return s.hp + s.atk + s.def + s.spAtk + s.spDef + s.speed;
}

const shapeClips: Record<string, string> = {
  quadruped: 'polygon(20% 85%, 25% 35%, 40% 15%, 60% 15%, 75% 35%, 80% 85%, 65% 95%, 35% 95%)',
  bipedal: 'polygon(35% 100%, 35% 50%, 22% 38%, 32% 15%, 50% 2%, 68% 15%, 78% 38%, 65% 50%, 65% 100%)',
  serpentine: 'polygon(8% 55%, 25% 28%, 50% 18%, 75% 28%, 92% 48%, 82% 72%, 50% 82%, 18% 72%)',
  avian: 'polygon(50% 5%, 78% 28%, 95% 48%, 72% 58%, 50% 72%, 28% 58%, 5% 48%, 22% 28%)',
  amorphous: 'polygon(22% 78%, 15% 35%, 35% 12%, 65% 12%, 85% 35%, 78% 78%, 50% 92%)',
};

export default function CreatureCard({ creature, typeMap, onClick, spriteUrl }: Props) {
  const total = getStatTotal(creature.baseStats);
  const { baseColor, accentColor, shape } = creature.spriteConfig;
  const clip = shapeClips[shape] || shapeClips.amorphous;
  const primaryType = typeMap[creature.type[0]];

  return (
    <button
      onClick={onClick}
      role="listitem"
      aria-label={`${creature.name} - ${creature.type.map(t => typeMap[t]?.name).join('/')} 타입, 총 스탯 ${total}`}
      class="bg-pk-surface border-2 border-pk-border/30 p-3 text-left cursor-pointer transition-all hover:border-pk-accent/50 hover:translate-y-[-2px] group relative overflow-hidden"
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}
    >
      {/* Subtle type glow on hover */}
      <div
        class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: `radial-gradient(circle at 50% 30%, ${primaryType?.color || '#888'}10, transparent 70%)` }}
        aria-hidden="true"
      />

      <div class="relative">
        {/* Sprite */}
        <div class="w-full aspect-square mb-2 flex items-center justify-center relative" style={{ background: 'rgba(0,0,0,0.15)' }}>
          {spriteUrl ? (
            <img
              src={spriteUrl}
              alt={creature.name}
              class="w-14 h-14 transition-transform group-hover:scale-110 object-contain"
              style={{ imageRendering: 'pixelated' }}
              loading="lazy"
            />
          ) : (
            <div
              class="w-14 h-14 transition-transform group-hover:scale-110"
              style={{
                background: `linear-gradient(145deg, ${baseColor}, ${accentColor})`,
                clipPath: clip,
                filter: `drop-shadow(0 2px 4px ${baseColor}40)`,
              }}
              aria-hidden="true"
            />
          )}
          <span class="absolute top-1 left-1 text-[9px] text-pk-muted/60">
            #{String(creature.id).padStart(3, '0')}
          </span>
        </div>

        {/* Name */}
        <p class="text-xs text-pk-text truncate mb-1.5">{creature.name}</p>

        {/* Types */}
        <div class="flex gap-1 mb-1">
          {creature.type.map(t => {
            const info = typeMap[t];
            return (
              <span
                key={t}
                class="px-1.5 py-0 text-[8px] text-white"
                style={{
                  background: info?.color ?? '#888',
                  textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
                }}
              >
                {info?.name ?? t}
              </span>
            );
          })}
        </div>

        {/* Stat total */}
        <p class="text-[9px] text-pk-muted">총 {total}</p>
      </div>
    </button>
  );
}
