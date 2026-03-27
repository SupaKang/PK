// 몬스터 알 발견 시스템
// 특정 몬스터 조합 + 높은 유대도 = 희귀 몬스터 알

export const EGG_COMBOS = [
  { parents: [1, 4], result: 59, requiredBond: 100, name: '프리즘 알' },  // 불꽃냥+물방울이 = 프리즘냥
  { parents: [7, 31], result: 63, requiredBond: 120, name: '유령여우 알' }, // 새싹이+암흑냥이
  { parents: [10, 14], result: 41, requiredBond: 80, name: '일반 알' },
  { parents: [33, 47], result: 75, requiredBond: 150, name: '빙암 알' },   // 암석+빙결
  { parents: [101, 31], result: 83, requiredBond: 100, name: '달빛 알' },  // 고랭이+암흑냥이
];

export function checkEggAvailable(party) {
  const partyIds = party.filter(m => !m.isContractor).map(m => m.id);
  const partyBonds = {};
  party.forEach(m => { if (!m.isContractor) partyBonds[m.id] = m.bond || 0; });

  for (const combo of EGG_COMBOS) {
    const [p1, p2] = combo.parents;
    if (partyIds.includes(p1) && partyIds.includes(p2)) {
      const bond1 = partyBonds[p1] || 0;
      const bond2 = partyBonds[p2] || 0;
      if (bond1 >= combo.requiredBond && bond2 >= combo.requiredBond) {
        return combo;
      }
    }
  }
  return null;
}
