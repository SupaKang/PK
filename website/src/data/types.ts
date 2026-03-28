import typesJson from '../../../data/types.json';

export interface TypeInfo {
  id: string;
  name: string;
  color: string;
}

export interface TypesData {
  types: TypeInfo[];
  matchups: Record<string, Record<string, number>>;
}

const data = typesJson as TypesData;

export const types = data.types;
export const matchups = data.matchups;

export function getTypeColor(typeId: string): string {
  return types.find(t => t.id === typeId)?.color ?? '#BBBBAA';
}

export function getTypeName(typeId: string): string {
  return types.find(t => t.id === typeId)?.name ?? typeId;
}

export function getEffectiveness(atkType: string, defType: string): number {
  return matchups[atkType]?.[defType] ?? 1.0;
}
