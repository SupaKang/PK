// 파티 편성 보너스
// 특정 타입 조합이 파티에 있을 때 전투 보너스

export const FORMATIONS = [
  { id: 'rainbow', name: '무지개 편성', description: '5종 이상 다른 타입',
    check: (types) => new Set(types).size >= 5,
    bonus: { exp: 1.2 }, // +20% exp
  },
  { id: 'mono', name: '단일 타입', description: '전원 같은 타입',
    check: (types) => new Set(types).size === 1 && types.length >= 3,
    bonus: { damage: 1.1 }, // +10% damage
  },
  { id: 'elemental', name: '원소 삼각', description: '화염+해류+자연',
    check: (types) => types.includes('fire') && types.includes('water') && types.includes('grass'),
    bonus: { accuracy: 5 }, // +5% accuracy
  },
  { id: 'dark_light', name: '빛과 어둠', description: '광명+암흑',
    check: (types) => types.includes('light') && types.includes('dark'),
    bonus: { crit: 5 }, // +5% crit
  },
  { id: 'dragon_force', name: '용의 힘', description: '용린 2마리 이상',
    check: (types) => types.filter(t => t === 'dragon').length >= 2,
    bonus: { damage: 1.15 }, // +15% damage
  },
];

export function getActiveFormation(party) {
  const types = [];
  for (const m of party) {
    if (m.isContractor) continue;
    if (m.currentHp > 0 && m.type) {
      types.push(...m.type);
    }
  }

  for (const f of FORMATIONS) {
    if (f.check(types)) return f;
  }
  return null;
}
