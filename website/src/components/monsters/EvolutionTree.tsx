interface Monster {
  id: number; name: string; type: string[];
  evolution: { to: number; level: number } | null;
  spriteConfig: { baseColor: string; accentColor: string; shape: string; features: string[] };
}

interface TypeInfo { id: string; name: string; color: string; }

interface Props {
  chain: Monster[];
  typeMap: Record<string, TypeInfo>;
  currentId: number;
}

export default function EvolutionTree({ chain, typeMap, currentId }: Props) {
  return (
    <div class="flex flex-wrap items-center gap-2">
      {chain.map((m, i) => {
        const isCurrent = m.id === currentId;
        const color = typeMap[m.type[0]]?.color ?? '#888';
        return (
          <div key={m.id} class="flex items-center gap-2">
            {/* Monster node */}
            <div
              class="text-center p-2 border-2 transition-all"
              style={{
                borderColor: isCurrent ? color : 'rgba(136,136,170,0.3)',
                background: isCurrent ? `${color}15` : 'transparent',
                minWidth: '70px',
              }}
            >
              {/* Mini sprite */}
              <div
                class="w-8 h-8 mx-auto mb-1"
                style={{
                  background: `linear-gradient(135deg, ${m.spriteConfig.baseColor}, ${m.spriteConfig.accentColor})`,
                  clipPath: 'polygon(25% 75%, 25% 25%, 50% 10%, 75% 25%, 75% 75%, 50% 90%)',
                }}
              />
              <p class="text-[10px] text-pk-text">{m.name}</p>
              <p class="text-[9px] text-pk-muted">#{String(m.id).padStart(3, '0')}</p>
            </div>

            {/* Arrow with level */}
            {i < chain.length - 1 && m.evolution && (
              <div class="flex flex-col items-center text-[9px] text-pk-muted">
                <span>Lv.{m.evolution.level}</span>
                <span>→</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
