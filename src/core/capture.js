// 포획 시스템 (배틀 외부에서 사용하는 유틸)

/**
 * 포획 볼 배율
 */
export const BALL_MULTIPLIERS = {
  capsule_ball: 1,
  high_ball: 1.5,
  ultra_ball: 2,
  master_ball: 255,
};

/**
 * 포획 볼 이름
 */
export const BALL_NAMES = {
  capsule_ball: '캡슐볼',
  high_ball: '하이볼',
  ultra_ball: '울트라볼',
  master_ball: '마스터볼',
};

/**
 * 포획 확률 계산 (미리보기용)
 */
export function estimateCatchRate(monster, ballId) {
  const multiplier = BALL_MULTIPLIERS[ballId] || 1;
  if (multiplier >= 255) return 1;

  const maxHp = monster.stats.hp;
  const currentHp = monster.currentHp;
  const catchRate = monster.catchRate;

  const a = ((3 * maxHp - 2 * currentHp) * catchRate * multiplier) / (3 * maxHp);
  return Math.min(1, a / 255);
}
