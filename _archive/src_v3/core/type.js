// 타입 상성 시스템
let typesData = null;

export async function loadTypes() {
  const res = await fetch('./data/types.json');
  typesData = await res.json();
  return typesData;
}

export function getTypes() {
  return typesData;
}

export function getType(id) {
  return typesData?.types.find(t => t.id === id);
}

/**
 * 타입 상성 배율 계산
 * @returns {number} 0, 0.5, 1, 2 (무효, 별로, 보통, 효과적)
 */
export function getEffectiveness(attackType, defendTypes) {
  if (!typesData) return 1;
  let multiplier = 1;
  for (const defType of defendTypes) {
    const val = typesData.matchups[attackType]?.[defType];
    if (val !== undefined) {
      multiplier *= val;
    }
  }
  return multiplier;
}

export function getEffectivenessText(multiplier) {
  if (multiplier === 0) return '효과가 없다...';
  if (multiplier < 1) return '효과가 별로인 것 같다...';
  if (multiplier > 1) return '효과가 굉장했다!';
  return null;
}
