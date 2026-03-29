import monstersJson from '../../../data/creature.json';

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spAtk: number;
  spDef: number;
  speed: number;
}

export interface LearnsetEntry {
  level: number;
  skillId: string;
}

export interface SpriteConfig {
  baseColor: string;
  accentColor: string;
  shape: string;
  features: string[];
}

export interface Monster {
  id: number;
  name: string;
  type: string[];
  baseStats: BaseStats;
  growthRate: string;
  evolution: { to: number; level: number } | null;
  catchRate: number;
  expYield: number;
  learnset: LearnsetEntry[];
  uniqueSkill: LearnsetEntry | null;
  description: string;
  spriteConfig: SpriteConfig;
}

const data = monstersJson as { creatures: Monster[] };

export const monsters = data.creatures;

export function getMonster(id: number): Monster | undefined {
  return monsters.find(m => m.id === id);
}

export function getEvolutionChain(id: number): Monster[] {
  const chain: Monster[] = [];
  // Find the root (pre-evolution)
  let rootId = id;
  let found = true;
  while (found) {
    found = false;
    for (const m of monsters) {
      if (m.evolution?.to === rootId) {
        rootId = m.id;
        found = true;
        break;
      }
    }
  }
  // Build chain forward
  let current: Monster | undefined = monsters.find(m => m.id === rootId);
  while (current) {
    chain.push(current);
    if (current.evolution) {
      current = monsters.find(m => m.id === current!.evolution!.to);
    } else {
      break;
    }
  }
  return chain;
}

export function getStatTotal(stats: BaseStats): number {
  return stats.hp + stats.atk + stats.def + stats.spAtk + stats.spDef + stats.speed;
}
