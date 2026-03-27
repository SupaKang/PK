export const RECIPES = [
  { id: 'r_super_potion', name: '고급포션 제조',
    ingredients: [{ itemId: 'potion', count: 3 }],
    result: { itemId: 'super_potion', count: 1 },
    description: '포션 3개를 합쳐 고급포션을 만든다.' },
  { id: 'r_hyper_potion', name: '최고급포션 제조',
    ingredients: [{ itemId: 'super_potion', count: 3 }],
    result: { itemId: 'hyper_potion', count: 1 },
    description: '고급포션 3개를 합쳐 최고급포션을 만든다.' },
  { id: 'r_high_stone', name: '상급 마석 강화',
    ingredients: [{ itemId: 'magic_stone', count: 5 }],
    result: { itemId: 'high_stone', count: 1 },
    description: '마석 5개를 합쳐 상급 마석을 만든다.' },
  { id: 'r_ultra_stone', name: '최상급 마석 강화',
    ingredients: [{ itemId: 'high_stone', count: 3 }],
    result: { itemId: 'ultra_stone', count: 1 },
    description: '상급 마석 3개를 합쳐 최상급 마석을 만든다.' },
  { id: 'r_full_revive', name: '완전부활초 조합',
    ingredients: [{ itemId: 'revive', count: 2 }, { itemId: 'hyper_potion', count: 1 }],
    result: { itemId: 'full_revive', count: 1 },
    description: '부활초 2개와 최고급포션으로 완전부활초를 만든다.' },
  { id: 'r_ration', name: '전투 식량 조리',
    ingredients: [{ itemId: 'potion', count: 2 }],
    result: { itemId: 'ration', count: 1 },
    description: '포션 2개로 전투 식량을 만든다.' },
];

export function canCraft(recipe, inventory) {
  return recipe.ingredients.every(ing => inventory.getCount(ing.itemId) >= ing.count);
}

export function craft(recipe, inventory) {
  if (!canCraft(recipe, inventory)) return false;
  for (const ing of recipe.ingredients) {
    inventory.removeItem(ing.itemId, ing.count);
  }
  inventory.addItem(recipe.result.itemId, recipe.result.count);
  return true;
}
