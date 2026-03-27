// 몬스터 특성(패시브) 시스템
// 각 몬스터 타입에 고유 패시브 효과

export const TYPE_ABILITIES = {
  fire:     { name: '불꽃 몸', effect: 'burn_touch', description: '접촉 시 10% 화상' },
  water:    { name: '빗물받이', effect: 'rain_heal', description: '비 올 때 HP 회복' },
  grass:    { name: '광합성', effect: 'sun_heal', description: '낮에 HP 소량 회복' },
  electric: { name: '정전기', effect: 'para_touch', description: '접촉 시 10% 마비' },
  ice:      { name: '얼음 몸', effect: 'freeze_touch', description: '접촉 시 5% 빙결' },
  dark:     { name: '어둠 적응', effect: 'night_boost', description: '밤에 공격력 +10%' },
  light:    { name: '빛의 가호', effect: 'day_boost', description: '낮에 특수방어 +10%' },
  dragon:   { name: '용의 위압', effect: 'intimidate', description: '등장 시 상대 공격 -1' },
  fighting: { name: '근성', effect: 'guts', description: '상태이상 시 공격력 +50%' },
  poison:   { name: '독 가시', effect: 'poison_touch', description: '접촉 시 15% 독' },
  metal:    { name: '견고함', effect: 'sturdy', description: '일격사 방지 (HP 1 생존)' },
  rock:     { name: '단단한 껍질', effect: 'shell', description: '크리티컬 무효' },
  wind:     { name: '가속', effect: 'speed_boost', description: '매 턴 속도 +1' },
  spirit:   { name: '부유', effect: 'levitate', description: '대지 타입 무효' },
  earth:    { name: '모래 숨기', effect: 'sand_veil', description: '회피율 +10%' },
  sound:    { name: '방음', effect: 'soundproof', description: '소리 기술 무효' },
  cosmic:   { name: '시공 왜곡', effect: 'warp', description: '선공 기술 무효화' },
  normal:   { name: '적응력', effect: 'adaptability', description: 'STAB 1.5x → 2.0x' },
};

export function getMonsterAbility(monster) {
  if (!monster || !monster.type || monster.type.length === 0) return null;
  return TYPE_ABILITIES[monster.type[0]] || null;
}

export function getAbilityName(monster) {
  const ability = getMonsterAbility(monster);
  return ability ? ability.name : '없음';
}
