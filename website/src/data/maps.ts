import mapsJson from '../../../data/maps.json';

export interface WildEncounter {
  monsterId: number;
  minLevel: number;
  maxLevel: number;
  weight: number;
}

export interface GameMap {
  id: string;
  name: string;
  type: string;
  description: string;
  connections: string[];
  encounters: WildEncounter[] | null;
  requiredBadges: number;
  wildEncounterRate: number;
  gym?: {
    leader: string;
    type: string;
    badge: string;
  } | null;
}

const data = mapsJson as { maps: GameMap[] };

export const maps = data.maps;

export function getMap(id: string): GameMap | undefined {
  return maps.find(m => m.id === id);
}
