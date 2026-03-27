// 몬스터 합성 시스템
// 같은 종의 몬스터 2마리를 합쳐서 스탯이 강화된 개체를 만든다

export function canFuse(monster1, monster2) {
  if (!monster1 || !monster2) return false;
  if (monster1.isContractor || monster2.isContractor) return false;
  if (monster1.uid === monster2.uid) return false;
  // Must be same species
  return monster1.id === monster2.id;
}

export function fuseMonsters(monster1, monster2) {
  if (!canFuse(monster1, monster2)) return null;

  // Result: higher level of the two + 2 bonus levels
  const resultLevel = Math.max(monster1.level, monster2.level) + 2;

  // Inherit better IVs from both parents
  const iv = {};
  for (const stat of ['hp', 'atk', 'def', 'spAtk', 'spDef', 'speed']) {
    iv[stat] = Math.max(monster1.iv[stat] || 0, monster2.iv[stat] || 0);
  }

  // Inherit higher bond
  const bond = Math.max(monster1.bond || 0, monster2.bond || 0);

  // Keep nickname if either had one
  const nickname = monster1.nickname || monster2.nickname || null;

  return {
    monsterId: monster1.id,
    level: Math.min(100, resultLevel),
    iv,
    bond,
    nickname,
    fusionBonus: true, // Mark as fused for visual indicator
  };
}
