// 구역 보스 + 보물 + 귀환 시스템
// 각 탐험 맵의 끝에는 수문장(보스)이 있다.
// 보스를 쓰러뜨리면 희귀 보물을 획득하고 귀환해야 한다.

/**
 * 구역별 보스 정의
 * 각 맵 ID에 대응하는 보스 몬스터와 보상
 */
const ZONE_BOSSES = {
  route_01: {
    name: '숲의 우두머리',
    description: '1번 도로의 깊은 숲에 서식하는 강력한 야생 몬스터.',
    team: [
      { monsterId: 14, level: 10 },
      { monsterId: 21, level: 12 },
    ],
    rewards: {
      money: 1000,
      exp: 300,
      items: [
        { itemId: 'super_potion', count: 2 },
      ],
    },
    position: { x: 22, y: 2 }, // boss location on tilemap
  },

  route_02: {
    name: '바위동굴의 지배자',
    description: '동굴 깊은 곳에 숨어있는 암석 거인.',
    team: [
      { monsterId: 33, level: 15 },
      { monsterId: 61, level: 17 },
      { monsterId: 12, level: 18 },
    ],
    rewards: {
      money: 2500,
      exp: 500,
      items: [
        { itemId: 'high_stone', count: 3 },
        { itemId: 'revive', count: 1 },
      ],
    },
    position: { x: 20, y: 5 },
  },

  route_03: {
    name: '마기의 파수꾼',
    description: '마기가 짙은 지역을 지키는 그림자단의 정예.',
    team: [
      { monsterId: 31, level: 20 },
      { monsterId: 64, level: 22 },
      { monsterId: 88, level: 24 },
    ],
    rewards: {
      money: 4000,
      exp: 800,
      items: [
        { itemId: 'ultra_stone', count: 2 },
        { itemId: 'full_revive', count: 1 },
      ],
    },
    position: { x: 18, y: 3 },
  },

  cave_01: {
    name: '동굴의 지배자',
    description: '어둠 속에서 잠든 거대한 암석 몬스터.',
    team: [
      { monsterId: 33, level: 14 },
      { monsterId: 61, level: 16 },
    ],
    rewards: {
      money: 2000,
      exp: 400,
      items: [
        { itemId: 'high_stone', count: 2 },
        { itemId: 'revive', count: 1 },
      ],
    },
    position: { x: 15, y: 3 },
  },
};

/**
 * 보물 상자 정의 (보스 격파 후 or 맵 곳곳)
 */
const TREASURE_POOLS = {
  common: [
    { itemId: 'potion', count: 3, weight: 5 },
    { itemId: 'magic_stone', count: 2, weight: 4 },
    { itemId: 'antidote', count: 2, weight: 3 },
    { itemId: 'escape_rope', count: 1, weight: 2 },
  ],
  uncommon: [
    { itemId: 'super_potion', count: 2, weight: 4 },
    { itemId: 'high_stone', count: 2, weight: 3 },
    { itemId: 'status_cure', count: 2, weight: 3 },
    { itemId: 'revive', count: 1, weight: 2 },
    { itemId: 'pp_restore', count: 1, weight: 2 },
  ],
  rare: [
    { itemId: 'hyper_potion', count: 2, weight: 3 },
    { itemId: 'ultra_stone', count: 1, weight: 2 },
    { itemId: 'full_revive', count: 1, weight: 2 },
    { itemId: 'pp_restore_full', count: 1, weight: 1 },
  ],
  legendary: [
    { itemId: 'domination_stone', count: 1, weight: 1 },
    { itemId: 'hyper_potion', count: 5, weight: 2 },
    { itemId: 'full_revive', count: 3, weight: 2 },
  ],
};

/**
 * 가중 랜덤 선택
 */
function weightedPick(pool) {
  const total = pool.reduce((s, i) => s + i.weight, 0);
  let roll = Math.random() * total;
  for (const item of pool) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return pool[pool.length - 1];
}

/**
 * 보물 상자에서 아이템 생성
 * @param {'common'|'uncommon'|'rare'|'legendary'} tier
 * @param {number} count - 아이템 종류 수
 * @returns {Array} [{itemId, count}]
 */
export function generateTreasure(tier = 'common', count = 2) {
  const pool = TREASURE_POOLS[tier] || TREASURE_POOLS.common;
  const results = [];
  const picked = new Set();

  for (let i = 0; i < count; i++) {
    let item;
    let attempts = 0;
    do {
      item = weightedPick(pool);
      attempts++;
    } while (picked.has(item.itemId) && attempts < 10);

    picked.add(item.itemId);
    results.push({ itemId: item.itemId, count: item.count });
  }
  return results;
}

/**
 * 구역 보스 데이터 가져오기
 * @param {string} zoneId - 맵 ID
 * @returns {Object|null} 보스 데이터
 */
export function getZoneBoss(zoneId) {
  return ZONE_BOSSES[zoneId] || null;
}

/**
 * 보스 격파 확인 및 보상 계산
 * @param {string} zoneId
 * @returns {Object} { money, exp, items, message }
 */
export function getBossRewards(zoneId) {
  const boss = ZONE_BOSSES[zoneId];
  if (!boss) return { money: 0, exp: 0, items: [], message: '' };

  return {
    money: boss.rewards.money,
    exp: boss.rewards.exp,
    items: [...boss.rewards.items],
    message: `${boss.name}을(를) 쓰러뜨렸다! 보물을 획득했다!`,
  };
}

/**
 * 귀환 아이템 정의
 */
export const RETURN_ITEMS = {
  escape_rope: {
    name: '탈출로프',
    apCost: 0,           // 즉시 귀환
    description: '즉시 출발 지점으로 귀환한다.',
  },
  return_scroll: {
    name: '귀환의 두루마리',
    apCost: 0,
    description: '마석의 힘으로 출발 지점으로 순간이동한다.',
  },
};

/**
 * 도보 귀환 AP 계산
 * 현재 위치에서 시작 지점까지의 대략적 거리(맨해튼)
 * @param {number} currentX
 * @param {number} currentY
 * @param {number} startX
 * @param {number} startY
 * @returns {number} 필요한 AP
 */
export function calculateReturnAP(currentX, currentY, startX, startY) {
  return Math.abs(currentX - startX) + Math.abs(currentY - startY);
}

/**
 * 귀환 가능 여부 체크
 * @param {number} remainingAP
 * @param {number} returnAP - 필요한 AP
 * @param {boolean} hasReturnItem - 귀환 아이템 보유
 * @returns {{canReturn: boolean, method: string, apNeeded: number}}
 */
export function checkReturnPossible(remainingAP, returnAP, hasReturnItem) {
  if (hasReturnItem) {
    return { canReturn: true, method: 'item', apNeeded: 0 };
  }
  if (remainingAP >= returnAP) {
    return { canReturn: true, method: 'walk', apNeeded: returnAP };
  }
  return {
    canReturn: false,
    method: 'none',
    apNeeded: returnAP,
    message: `귀환에 ${returnAP}AP가 필요하지만 ${remainingAP}AP밖에 없다!`,
  };
}

export { ZONE_BOSSES, TREASURE_POOLS };
