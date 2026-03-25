// 계약 시스템 (마석을 사용한 몬스터 계약)

/**
 * 마석 배율
 */
export const STONE_MULTIPLIERS = {
  magic_stone: 1,
  high_stone: 1.5,
  ultra_stone: 2,
  domination_stone: 255,
};

// 하위 호환 (기존 코드에서 BALL_MULTIPLIERS 참조 시)
export const BALL_MULTIPLIERS = STONE_MULTIPLIERS;

/**
 * 마석 이름
 */
export const STONE_NAMES = {
  magic_stone: '마석',
  high_stone: '상급 마석',
  ultra_stone: '최상급 마석',
  domination_stone: '지배의 마석',
};

/**
 * 계약 확률 계산 (미리보기용)
 */
export function estimateContractRate(monster, stoneId) {
  const multiplier = STONE_MULTIPLIERS[stoneId] || 1;
  if (multiplier >= 255) return 1;

  const maxHp = monster.stats.hp;
  const currentHp = monster.currentHp;
  const catchRate = monster.catchRate;

  const a = ((3 * maxHp - 2 * currentHp) * catchRate * multiplier) / (3 * maxHp);
  return Math.min(1, a / 255);
}

// 하위 호환
export const estimateCatchRate = estimateContractRate;
