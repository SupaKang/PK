import itemsJson from '../../../data/items.json';

export interface ItemEffect {
  type: string;
  value: number | string;
  stat?: string;
  subtype?: string;
}

export interface Item {
  id: string;
  name: string;
  category: string;
  price: number;
  effect: ItemEffect;
  description: string;
  usableInBattle: boolean;
}

const data = itemsJson as { items: Item[] };

export const items = data.items;

export const itemCategories: Record<string, string> = {
  healing: '회복',
  contract: '계약',
  battle: '전투',
  key: '열쇠',
  consumable: '소모품',
};
