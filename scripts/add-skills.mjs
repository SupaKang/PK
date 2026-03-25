import fs from 'fs';

const skills = JSON.parse(fs.readFileSync('public/data/skills.json', 'utf8'));

const newSkills = [
  // PRIORITY MOVES
  { id: 'quick_guard', name: '전광석화', type: 'normal', category: 'physical', power: 40, accuracy: 100, pp: 30, priority: 1, effect: null, description: '번개처럼 빠른 선공 공격.' },
  { id: 'ice_shard_plus', name: '얼음침', type: 'ice', category: 'physical', power: 40, accuracy: 100, pp: 30, priority: 1, effect: null, description: '날카로운 얼음을 선공으로 쏜다.' },
  { id: 'shadow_strike', name: '그림자 일격', type: 'dark', category: 'physical', power: 40, accuracy: 100, pp: 30, priority: 1, effect: null, description: '그림자 속에서 기습한다.' },
  { id: 'flame_dash', name: '화염 돌진', type: 'fire', category: 'physical', power: 45, accuracy: 100, pp: 20, priority: 1, effect: { type: 'burn', chance: 10, target: 'enemy' }, description: '불꽃을 두르고 선공 돌진.' },
  { id: 'aqua_jet_plus', name: '급류 돌격', type: 'water', category: 'physical', power: 45, accuracy: 100, pp: 20, priority: 1, effect: null, description: '물살을 타고 선공 돌격.' },
  { id: 'mach_punch', name: '마하 펀치', type: 'fighting', category: 'physical', power: 40, accuracy: 100, pp: 30, priority: 1, effect: null, description: '눈에 보이지 않는 속도의 주먹.' },
  { id: 'sucker_punch', name: '기습', type: 'dark', category: 'physical', power: 70, accuracy: 100, pp: 5, priority: 1, effect: null, description: '상대가 공격하려는 순간을 노린다.' },

  // MULTI-HIT MOVES
  { id: 'barrage', name: '연속 돌팔매', type: 'rock', category: 'physical', power: 25, accuracy: 90, pp: 20, effect: { type: 'multi_hit' }, description: '돌을 2~5번 연속으로 던진다.' },
  { id: 'triple_kick', name: '삼연각', type: 'fighting', category: 'physical', power: 30, accuracy: 90, pp: 10, effect: { type: 'multi_hit', hits: 3 }, description: '세 번 연속으로 찬다.' },
  { id: 'bullet_seed', name: '씨앗 기관총', type: 'grass', category: 'physical', power: 25, accuracy: 100, pp: 30, effect: { type: 'multi_hit' }, description: '씨앗을 2~5발 연사한다.' },
  { id: 'icicle_spear', name: '고드름 창', type: 'ice', category: 'physical', power: 25, accuracy: 100, pp: 30, effect: { type: 'multi_hit' }, description: '날카로운 고드름을 2~5번 찔러넣는다.' },
  { id: 'tail_slap', name: '연속 꼬리치기', type: 'normal', category: 'physical', power: 25, accuracy: 85, pp: 10, effect: { type: 'multi_hit' }, description: '꼬리로 2~5번 후려친다.' },
  { id: 'double_chop', name: '이중 가르기', type: 'dragon', category: 'physical', power: 40, accuracy: 90, pp: 15, effect: { type: 'multi_hit', hits: 2 }, description: '두 번 연속 베어낸다.' },
  { id: 'twin_bolt', name: '이중 번개', type: 'electric', category: 'special', power: 40, accuracy: 90, pp: 15, effect: { type: 'multi_hit', hits: 2 }, description: '번개를 두 줄기 내리꽂는다.' },

  // PROTECT / COUNTER
  { id: 'iron_wall', name: '철벽 방어', type: 'metal', category: 'status', power: 0, accuracy: 999, pp: 10, priority: 4, effect: { type: 'protect' }, description: '이 턴 모든 공격을 막는다.' },
  { id: 'light_barrier', name: '빛의 장벽', type: 'light', category: 'status', power: 0, accuracy: 999, pp: 10, priority: 4, effect: { type: 'protect' }, description: '빛의 결계로 공격을 막아낸다.' },
  { id: 'revenge', name: '복수', type: 'fighting', category: 'physical', power: 60, accuracy: 100, pp: 10, priority: -4, effect: null, description: '후공으로 공격. 이 턴 데미지를 받았으면 위력 2배.' },

  // HIGH CRIT MOVES
  { id: 'razor_wind', name: '칼바람', type: 'wind', category: 'special', power: 80, accuracy: 100, pp: 10, effect: { type: 'high_crit' }, description: '예리한 바람. 급소에 맞기 쉽다.' },
  { id: 'cross_chop', name: '십자 가르기', type: 'fighting', category: 'physical', power: 100, accuracy: 80, pp: 5, effect: { type: 'high_crit' }, description: '팔을 교차하여 내리친다. 급소율 높음.' },
  { id: 'shadow_crit', name: '급소 찌르기', type: 'spirit', category: 'physical', power: 70, accuracy: 100, pp: 15, effect: { type: 'high_crit' }, description: '영혼의 틈을 노린다. 급소에 맞기 쉽다.' },
  { id: 'leaf_blade', name: '리프 블레이드', type: 'grass', category: 'physical', power: 90, accuracy: 100, pp: 15, effect: { type: 'high_crit' }, description: '잎사귀 검으로 벤다. 급소율 높음.' },
  { id: 'psycho_cut', name: '염동 베기', type: 'cosmic', category: 'physical', power: 70, accuracy: 100, pp: 20, effect: { type: 'high_crit' }, description: '염동력 칼날. 급소에 맞기 쉽다.' },

  // REVERSAL / HP-BASED
  { id: 'last_stand', name: '최후의 일격', type: 'fighting', category: 'physical', power: 20, accuracy: 100, pp: 15, effect: { type: 'reversal' }, description: 'HP가 적을수록 위력이 올라간다.' },
  { id: 'eruption_blast', name: '분화', type: 'fire', category: 'special', power: 150, accuracy: 100, pp: 5, effect: { type: 'power_by_hp' }, description: 'HP가 높을수록 위력이 올라간다.' },
  { id: 'water_spout', name: '해수 분출', type: 'water', category: 'special', power: 150, accuracy: 100, pp: 5, effect: { type: 'power_by_hp' }, description: 'HP가 높을수록 위력이 올라간다.' },
  { id: 'desperation', name: '절사', type: 'dark', category: 'physical', power: 20, accuracy: 100, pp: 15, effect: { type: 'reversal' }, description: '절망적일수록 강해진다.' },

  // DRAIN / LEECH
  { id: 'giga_drain', name: '기가 드레인', type: 'grass', category: 'special', power: 75, accuracy: 100, pp: 10, effect: { type: 'drain', value: 0.5, target: 'enemy' }, description: '데미지의 50%를 흡수한다.' },
  { id: 'dream_eater', name: '꿈먹기', type: 'spirit', category: 'special', power: 100, accuracy: 100, pp: 15, effect: { type: 'drain', value: 0.5, target: 'enemy' }, description: '잠든 상대의 꿈을 먹는다.' },
  { id: 'drain_claw', name: '흡혈 할퀴기', type: 'dark', category: 'physical', power: 80, accuracy: 100, pp: 10, effect: { type: 'drain', value: 0.5, target: 'enemy' }, description: '체력을 빨아들이며 할퀸다.' },
  { id: 'leech_seed', name: '씨뿌리기', type: 'grass', category: 'status', power: 0, accuracy: 90, pp: 10, effect: { type: 'leech', target: 'enemy' }, description: '씨앗을 심어 매 턴 HP를 흡수한다.' },
  { id: 'horn_leech', name: '뿔 흡수', type: 'grass', category: 'physical', power: 75, accuracy: 100, pp: 10, effect: { type: 'drain', value: 0.5, target: 'enemy' }, description: '뿔로 받아 체력을 빨아들인다.' },

  // FREEZE SKILLS
  { id: 'absolute_zero', name: '절대영도', type: 'ice', category: 'special', power: 1, accuracy: 30, pp: 5, effect: { type: 'freeze', chance: 100, target: 'enemy' }, description: '맞으면 반드시 얼린다. 명중률이 매우 낮다.' },
  { id: 'frost_bite', name: '동상', type: 'ice', category: 'special', power: 65, accuracy: 100, pp: 15, effect: { type: 'freeze', chance: 20, target: 'enemy' }, description: '차가운 공기로 물어뜯는다. 빙결 확률 있음.' },
  { id: 'frozen_world', name: '얼어붙은 세계', type: 'ice', category: 'special', power: 110, accuracy: 85, pp: 5, effect: { type: 'freeze', chance: 30, target: 'enemy' }, description: '주변을 극한까지 냉각시킨다.' },

  // SLEEP SKILLS
  { id: 'hypnosis', name: '최면술', type: 'cosmic', category: 'status', power: 0, accuracy: 60, pp: 20, effect: { type: 'sleep', chance: 100, target: 'enemy' }, description: '최면 파동으로 상대를 재운다.' },
  { id: 'spore', name: '포자', type: 'grass', category: 'status', power: 0, accuracy: 100, pp: 15, effect: { type: 'sleep', chance: 100, target: 'enemy' }, description: '포자를 뿌려 반드시 잠재운다.' },
  { id: 'dark_lullaby', name: '어둠의 자장가', type: 'dark', category: 'status', power: 0, accuracy: 75, pp: 15, effect: { type: 'sleep', chance: 100, target: 'enemy' }, description: '어둠의 노래로 잠에 빠뜨린다.' },
  { id: 'yawn', name: '하품', type: 'normal', category: 'status', power: 0, accuracy: 999, pp: 10, effect: { type: 'sleep', chance: 100, target: 'enemy' }, description: '큰 하품으로 졸리게 만든다.' },

  // SELF-CURE
  { id: 'refresh', name: '재생', type: 'normal', category: 'status', power: 0, accuracy: 999, pp: 20, effect: { type: 'self_cure', target: 'self' }, description: '모든 상태이상을 스스로 치유한다.' },
  { id: 'aromatherapy', name: '아로마 테라피', type: 'grass', category: 'status', power: 0, accuracy: 999, pp: 5, effect: { type: 'self_cure', target: 'self' }, description: '향기로 상태이상을 치유한다.' },

  // STAT BOOSTING
  { id: 'sword_dance', name: '칼춤', type: 'normal', category: 'status', power: 0, accuracy: 999, pp: 20, effect: { type: 'stat_up', stat: 'atk', amount: 2, target: 'self' }, description: '격렬하게 춤춰 공격을 크게 올린다.' },
  { id: 'calm_mind', name: '명상', type: 'cosmic', category: 'status', power: 0, accuracy: 999, pp: 20, effect: { type: 'stat_up', stat: 'spAtk', amount: 2, target: 'self' }, description: '정신을 집중해 특수공격을 크게 올린다.' },
  { id: 'dragon_dance_plus', name: '용의 춤', type: 'dragon', category: 'status', power: 0, accuracy: 999, pp: 20, effect: { type: 'stat_up', stat: 'speed', amount: 1, target: 'self' }, description: '신비로운 춤으로 속도를 올린다.' },
  { id: 'shell_smash', name: '껍질 깨기', type: 'normal', category: 'status', power: 0, accuracy: 999, pp: 15, effect: { type: 'stat_up', stat: 'atk', amount: 2, target: 'self' }, description: '방어를 깎고 공격을 크게 올린다.' },

  // HEAVY HITTERS WITH DRAWBACKS
  { id: 'overheat', name: '오버히트', type: 'fire', category: 'special', power: 130, accuracy: 90, pp: 5, effect: { type: 'stat_down', stat: 'spAtk', amount: -2, target: 'self' }, description: '전력 방출. 사용 후 특수공격 크게 하락.' },
  { id: 'close_combat_plus', name: '인파이트', type: 'fighting', category: 'physical', power: 120, accuracy: 100, pp: 5, effect: { type: 'stat_down', stat: 'def', amount: -1, target: 'self' }, description: '무방비 돌격. 방어가 떨어진다.' },
  { id: 'brave_bird', name: '브레이브 버드', type: 'wind', category: 'physical', power: 120, accuracy: 100, pp: 15, effect: { type: 'recoil', value: 0.33 }, description: '목숨을 건 돌진. 반동 데미지를 받는다.' },
  { id: 'head_smash', name: '박치기', type: 'rock', category: 'physical', power: 150, accuracy: 80, pp: 5, effect: { type: 'recoil', value: 0.5 }, description: '머리를 세게 들이받는다. 큰 반동.' },
  { id: 'wild_charge', name: '와일드 차지', type: 'electric', category: 'physical', power: 90, accuracy: 100, pp: 15, effect: { type: 'recoil', value: 0.25 }, description: '전기를 감고 돌진. 약간의 반동.' },
  { id: 'flare_blitz', name: '화염 돌격', type: 'fire', category: 'physical', power: 120, accuracy: 100, pp: 15, effect: { type: 'recoil', value: 0.33 }, description: '온몸에 불을 감고 돌진. 반동 있음.' },

  // SOUND / LIGHT / COSMIC / METAL / POISON
  { id: 'boomburst', name: '폭음파', type: 'sound', category: 'special', power: 140, accuracy: 100, pp: 10, effect: null, description: '강렬한 폭음으로 모든 것을 뒤흔든다.' },
  { id: 'perish_song', name: '멸망의 노래', type: 'sound', category: 'status', power: 0, accuracy: 999, pp: 5, effect: { type: 'confuse', chance: 100, target: 'enemy' }, description: '듣는 자를 혼란에 빠뜨리는 저주의 노래.' },
  { id: 'moonblast', name: '문블래스트', type: 'light', category: 'special', power: 95, accuracy: 100, pp: 15, effect: { type: 'stat_down', stat: 'spAtk', amount: -1, chance: 30, target: 'enemy' }, description: '달빛의 힘으로 공격. 특공 하락 가능.' },
  { id: 'photon_geyser', name: '광자 분출', type: 'cosmic', category: 'special', power: 100, accuracy: 100, pp: 5, effect: null, description: '광자 에너지를 폭발시킨다.' },
  { id: 'prismatic_laser', name: '프리즘 레이저', type: 'cosmic', category: 'special', power: 160, accuracy: 100, pp: 10, effect: null, description: '강력한 프리즘 빔.' },
  { id: 'meteor_mash', name: '메테오 스매시', type: 'metal', category: 'physical', power: 90, accuracy: 90, pp: 10, effect: { type: 'stat_up', stat: 'atk', amount: 1, chance: 20, target: 'self' }, description: '유성처럼 내리꽂는다. 공격 상승 가능.' },
  { id: 'heavy_slam', name: '헤비 슬램', type: 'metal', category: 'physical', power: 80, accuracy: 100, pp: 10, effect: { type: 'flinch', chance: 30, target: 'enemy' }, description: '강철 몸으로 내리누른다. 풀죽음 가능.' },
  { id: 'toxic_shield', name: '독 엄폐', type: 'poison', category: 'status', power: 0, accuracy: 999, pp: 20, effect: { type: 'stat_up', stat: 'def', amount: 1, target: 'self' }, description: '독 가시로 몸을 감싸 방어를 올린다.' },
  { id: 'venom_wall', name: '독 방벽', type: 'poison', category: 'status', power: 0, accuracy: 999, pp: 10, priority: 4, effect: { type: 'protect' }, description: '독 결계로 방어. 접촉 시 독에 걸린다.' },

  // EARTH ADDITIONS
  { id: 'scorching_sand', name: '열사의 모래', type: 'earth', category: 'special', power: 70, accuracy: 100, pp: 10, effect: { type: 'burn', chance: 30, target: 'enemy' }, description: '뜨거운 모래를 내뿜는다. 화상 가능.' },
  { id: 'land_wrath', name: '대지의 분노', type: 'earth', category: 'physical', power: 100, accuracy: 100, pp: 10, effect: null, description: '대지의 힘을 끌어올려 강타한다.' },
];

skills.skills.push(...newSkills);
fs.writeFileSync('public/data/skills.json', JSON.stringify(skills));
fs.writeFileSync('data/skills.json', JSON.stringify(skills));
console.log(`Added ${newSkills.length} new skills. Total: ${skills.skills.length}`);
