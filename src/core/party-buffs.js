// 계약자 직업 스탯 → 파티 전투 버프 시스템
// 계약자의 직업과 레벨에 따라 파티 몬스터에게 전투 보너스를 부여한다.

/**
 * 직업별 파티 버프 정의
 * 각 직업은 특정 전투 스탯에 보너스를 제공한다.
 */
const CLASS_BUFFS = {
  warrior: {
    name: '전사의 기운',
    description: '파티 물리 명중률 상승, 물리 공격력 소폭 상승',
    buffs: [
      { type: 'accuracy_bonus', category: 'physical', value: 5 },   // +5% 물리 명중
      { type: 'power_bonus', category: 'physical', scale: 0.05 },   // +5% 물리 위력
    ],
  },
  mage: {
    name: '마법사의 지혜',
    description: '파티 특수기 위력 상승, 특수방어 소폭 상승',
    buffs: [
      { type: 'power_bonus', category: 'special', scale: 0.08 },    // +8% 특수 위력
      { type: 'stat_bonus', stat: 'spDef', scale: 0.05 },           // +5% 특수방어
    ],
  },
  archer: {
    name: '궁수의 눈',
    description: '파티 속도 상승, 명중률 상승',
    buffs: [
      { type: 'stat_bonus', stat: 'speed', scale: 0.08 },           // +8% 속도
      { type: 'accuracy_bonus', category: 'all', value: 3 },        // +3% 전체 명중
    ],
  },
  cleric: {
    name: '성직자의 축복',
    description: '파티 HP 회복 효과 증대, 상태이상 저항',
    buffs: [
      { type: 'heal_bonus', scale: 0.2 },                           // 회복량 +20%
      { type: 'status_resist', chance: 15 },                         // 15% 상태이상 저항
    ],
  },
  dark_knight: {
    name: '암흑기사의 압박',
    description: '파티 크리티컬 확률 상승, 흡수 공격 효과 증대',
    buffs: [
      { type: 'crit_bonus', value: 8 },                             // 크리티컬 +8%
      { type: 'drain_bonus', scale: 0.15 },                         // 흡수량 +15%
    ],
  },
};

/**
 * 레벨 배율 계산
 * 계약자 레벨이 높을수록 버프 효과 증가
 * @param {number} level - 계약자 레벨
 * @returns {number} 1.0 ~ 2.0 배율
 */
function getLevelMultiplier(level) {
  return 1 + Math.min(1, (level - 1) / 49); // Lv1=1.0, Lv50=2.0
}

/**
 * 파티 버프 계산
 * @param {Object} contractor - 계약자 객체 (classId, level)
 * @returns {Object} 적용할 버프 목록
 */
export function calculatePartyBuffs(contractor) {
  if (!contractor || !contractor.classId) return null;

  const classDef = CLASS_BUFFS[contractor.classId];
  if (!classDef) return null;

  const mult = getLevelMultiplier(contractor.level);

  return {
    classId: contractor.classId,
    className: classDef.name,
    description: classDef.description,
    multiplier: mult,
    buffs: classDef.buffs.map(b => ({
      ...b,
      // 레벨에 따라 스케일링
      effectiveValue: b.value ? Math.floor(b.value * mult) : undefined,
      effectiveScale: b.scale ? b.scale * mult : undefined,
    })),
  };
}

/**
 * 전투 데미지에 파티 버프 적용
 * @param {number} damage - 기본 데미지
 * @param {string} skillCategory - 'physical' | 'special' | 'status'
 * @param {Object} partyBuffs - calculatePartyBuffs() 결과
 * @returns {number} 보정된 데미지
 */
export function applyDamageBuff(damage, skillCategory, partyBuffs) {
  if (!partyBuffs) return damage;

  let result = damage;
  for (const buff of partyBuffs.buffs) {
    if (buff.type === 'power_bonus') {
      if (buff.category === 'all' || buff.category === skillCategory) {
        result = Math.floor(result * (1 + (buff.effectiveScale || 0)));
      }
    }
  }
  return result;
}

/**
 * 명중률 보너스 적용
 * @param {number} accuracy - 기본 명중률 (0-100)
 * @param {string} skillCategory - 'physical' | 'special'
 * @param {Object} partyBuffs
 * @returns {number} 보정된 명중률
 */
export function applyAccuracyBuff(accuracy, skillCategory, partyBuffs) {
  if (!partyBuffs) return accuracy;

  let bonus = 0;
  for (const buff of partyBuffs.buffs) {
    if (buff.type === 'accuracy_bonus') {
      if (buff.category === 'all' || buff.category === skillCategory) {
        bonus += buff.effectiveValue || 0;
      }
    }
  }
  return Math.min(100, accuracy + bonus);
}

/**
 * 크리티컬 확률 보너스
 * @param {number} baseCritRate - 기본 크리티컬 확률 (0-100)
 * @param {Object} partyBuffs
 * @returns {number} 보정된 크리티컬 확률
 */
export function applyCritBuff(baseCritRate, partyBuffs) {
  if (!partyBuffs) return baseCritRate;

  let bonus = 0;
  for (const buff of partyBuffs.buffs) {
    if (buff.type === 'crit_bonus') {
      bonus += buff.effectiveValue || 0;
    }
  }
  return baseCritRate + bonus;
}

/**
 * 회복량 보너스
 * @param {number} healAmount - 기본 회복량
 * @param {Object} partyBuffs
 * @returns {number} 보정된 회복량
 */
export function applyHealBuff(healAmount, partyBuffs) {
  if (!partyBuffs) return healAmount;

  for (const buff of partyBuffs.buffs) {
    if (buff.type === 'heal_bonus') {
      return Math.floor(healAmount * (1 + (buff.effectiveScale || 0)));
    }
  }
  return healAmount;
}

/**
 * 상태이상 저항 체크
 * @param {Object} partyBuffs
 * @returns {boolean} true면 상태이상 무효화
 */
export function checkStatusResist(partyBuffs) {
  if (!partyBuffs) return false;

  for (const buff of partyBuffs.buffs) {
    if (buff.type === 'status_resist') {
      return Math.random() * 100 < (buff.effectiveValue || buff.chance || 0);
    }
  }
  return false;
}

/**
 * 흡수 공격 보너스
 * @param {number} drainAmount - 기본 흡수량
 * @param {Object} partyBuffs
 * @returns {number} 보정된 흡수량
 */
export function applyDrainBuff(drainAmount, partyBuffs) {
  if (!partyBuffs) return drainAmount;

  for (const buff of partyBuffs.buffs) {
    if (buff.type === 'drain_bonus') {
      return Math.floor(drainAmount * (1 + (buff.effectiveScale || 0)));
    }
  }
  return drainAmount;
}

/**
 * 스탯 보너스 (속도, 특수방어 등)
 * @param {number} baseStat - 기본 스탯 값
 * @param {string} statName - 스탯 이름
 * @param {Object} partyBuffs
 * @returns {number} 보정된 스탯
 */
export function applyStatBuff(baseStat, statName, partyBuffs) {
  if (!partyBuffs) return baseStat;

  for (const buff of partyBuffs.buffs) {
    if (buff.type === 'stat_bonus' && buff.stat === statName) {
      return Math.floor(baseStat * (1 + (buff.effectiveScale || 0)));
    }
  }
  return baseStat;
}

/**
 * 파티 버프 요약 텍스트 (UI용)
 */
export function getBuffSummary(partyBuffs) {
  if (!partyBuffs) return [];
  return [
    `[${partyBuffs.className}] Lv배율: x${partyBuffs.multiplier.toFixed(1)}`,
    partyBuffs.description,
  ];
}

export { CLASS_BUFFS };
