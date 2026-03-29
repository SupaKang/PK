import creaturesJson from '../../../data/creature.json';

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

export interface Creature {
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

const data = creaturesJson as { creatures: Creature[] };

export const creatures = data.creatures;

export function getCreature(id: number): Creature | undefined {
  return creatures.find(c => c.id === id);
}

export function getEvolutionChain(id: number): Creature[] {
  const chain: Creature[] = [];
  // Find the root (pre-evolution)
  let rootId = id;
  let found = true;
  while (found) {
    found = false;
    for (const c of creatures) {
      if (c.evolution?.to === rootId) {
        rootId = c.id;
        found = true;
        break;
      }
    }
  }
  // Build chain forward
  let current: Creature | undefined = creatures.find(c => c.id === rootId);
  while (current) {
    chain.push(current);
    if (current.evolution) {
      current = creatures.find(c => c.id === current!.evolution!.to);
    } else {
      break;
    }
  }
  return chain;
}

export function getStatTotal(stats: BaseStats): number {
  return stats.hp + stats.atk + stats.def + stats.spAtk + stats.spDef + stats.speed;
}
