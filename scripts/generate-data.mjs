#!/usr/bin/env node
// 몬스터 + 맵 + 스토리 데이터 생성기
import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'public', 'data');

// ─── 스킬 DB 로드 ───
const skillsRaw = JSON.parse(readFileSync(join(DATA_DIR, 'skills.json'), 'utf-8'));
const skillsDB = Array.isArray(skillsRaw) ? skillsRaw : skillsRaw.skills;
const skillMap = {};
for (const s of skillsDB) skillMap[s.id] = s;

// 타입별 스킬 분류
const skillsByType = {};
for (const s of skillsDB) {
  if (!skillsByType[s.type]) skillsByType[s.type] = [];
  skillsByType[s.type].push(s.id);
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// 일반 스킬 (normal 타입) 풀백
const normalSkills = skillsByType['normal'] || [];

function getSkillsForType(type, count = 8) {
  const pool = [...(skillsByType[type] || [])];
  // normal 타입 스킬도 섞기
  const mixed = [...pool, ...normalSkills.slice(0, 5)];
  const result = [];
  const used = new Set();
  for (let i = 0; i < count && mixed.length > 0; i++) {
    const idx = Math.floor(Math.random() * mixed.length);
    const s = mixed[idx];
    if (!used.has(s)) {
      result.push(s);
      used.add(s);
    }
    mixed.splice(idx, 1);
  }
  return result;
}

// ─── 몬스터 이름 풀 ───
const NAMES = {
  fire: [
    ['염동이','화르미','불꽃새'],['홧불이','염왕','화염제'],['열풍이','용염','폭염룡'],
    ['촛불래','불여우','화산귀'],['숯방이','작렬']
  ],
  water: [
    ['물방울','파도리','해류왕'],['거품이','소용돌','심해룡'],['물고미','수정어','폭류'],
    ['빗방울','안개새','해일조'],['수달이','빙수']
  ],
  grass: [
    ['새싹이','꽃나무','대수호'],['덩굴이','숲요정','고목왕'],['씨앗이','풀꽃','꽃대장'],
    ['버섯이','독꽃','포자거'],['선인장','이끼']
  ],
  electric: [
    ['번개쥐','전격서','뇌신'],['전기뱀','방전사','뇌룡'],
    ['충전이','파동새'],['스파크','번개호']
  ],
  earth: [
    ['흙두지','굴파기','대지룡'],['모래쥐','사막왕'],
    ['진흙이','지진수']
  ],
  ice: [
    ['얼음새','빙하조','극빙황'],['눈토끼','서리곰'],
    ['결정이','빙수정']
  ],
  wind: [
    ['바람새','질풍조','태풍왕'],['솔바람','회오리'],
    ['돌풍이','기류사']
  ],
  poison: [
    ['독침이','맹독사','독왕뱀'],['독버섯','포이즌'],
    ['슬라임','독안개']
  ],
  metal: [
    ['철갑이','강철기','메탈킹'],['기어톱','톱니왕'],
    ['주석이','합금수']
  ],
  light: [
    ['빛나리','광명조','성광제'],['반딧불','섬광사'],
    ['프리즘','무지개']
  ],
  dark: [
    ['그림자','암흑사','명암왕'],['야귀','칠흑'],
    ['미혼','흑요석']
  ],
  spirit: [
    ['혼령이','유령왕','명계제'],['귀불','사령사'],
    ['망령','영혼불']
  ],
  dragon: [
    ['아룡이','비룡','천룡제'],['용새끼','쌍두룡'],
    ['해룡','고룡']
  ],
  fighting: [
    ['주먹이','격투사','무쌍왕'],['발차기','태권도'],
    ['힘돌이','무투가']
  ],
  rock: [
    ['돌멩이','바위곰','화산거'],['수정바위','절벽수'],
    ['화석이','암석인']
  ],
  sound: [
    ['울음이','진동새','폭음왕'],['메아리','공명사'],
    ['소리꾼','음파충']
  ],
  cosmic: [
    ['별조각','행성아','은하룡'],['운석이','혜성사'],
    ['우주먼지','성운']
  ],
  normal: [
    ['뭉치','진화수','만능왕'],['솜뭉치','달리기'],
    ['동글이','먹보']
  ],
};

const SHAPES = ['bipedal','quadruped','serpent','avian','amorphous','insectoid','aquatic','humanoid','mythical','elemental'];
const FEATURES_POOL = ['horns','wings','tail','fangs','claws','shell','fins','spikes','aura','crystals'];
const COLORS = {
  fire: ['#FF4422','#FF6600','#CC3300'],
  water: ['#3399FF','#2266CC','#44AAFF'],
  grass: ['#44BB44','#228822','#66DD44'],
  electric: ['#FFCC00','#FFE633','#DDAA00'],
  earth: ['#BB8844','#997733','#CC9955'],
  ice: ['#66CCEE','#88DDFF','#AAEEFF'],
  wind: ['#99DDBB','#77CCAA','#BBEECC'],
  poison: ['#AA44CC','#9933BB','#CC66DD'],
  metal: ['#AAAACC','#8888AA','#CCCCDD'],
  light: ['#FFEE88','#FFDD55','#FFFFAA'],
  dark: ['#554466','#443355','#665577'],
  spirit: ['#7766CC','#6655BB','#8877DD'],
  dragon: ['#6644BB','#5533AA','#7755CC'],
  fighting: ['#CC4444','#BB3333','#DD5555'],
  rock: ['#887744','#776633','#998855'],
  sound: ['#DD77AA','#CC6699','#EE88BB'],
  cosmic: ['#222255','#333377','#111144'],
  normal: ['#BBBBAA','#AAAA99','#CCCCBB'],
};

const ACCENT_COLORS = ['#FFAA00','#FF6699','#44DDFF','#AADDFF','#FFFF66','#FF8844','#88FF88','#DDAAFF','#FFFFFF','#FF4444'];

// ─── 진화 체인 정의 ───
const chains = [];
let nextId = 1;

// 스타터 3종 (fire, water, grass) — 3단 진화
const starterTypes = ['fire','water','grass'];
for (let t = 0; t < 3; t++) {
  const type = starterTypes[t];
  const names = NAMES[type][0];
  chains.push({
    monsters: [
      { id: nextId, name: names[0], type: [type], stage: 1, evoLevel: 16 },
      { id: nextId+1, name: names[1], type: [type], stage: 2, evoLevel: 36 },
      { id: nextId+2, name: names[2], type: [type], stage: 3, evoLevel: null },
    ]
  });
  nextId += 3;
}

// 12개 추가 3단진화 체인 (나머지 타입)
const threeStageTypes = ['electric','ice','wind','poison','metal','light','dark','spirit','dragon','fighting','rock','sound'];
for (let t = 0; t < 12; t++) {
  const type = threeStageTypes[t];
  const namePool = NAMES[type];
  const names = namePool[0] || [`${type}1`,`${type}2`,`${type}3`];
  chains.push({
    monsters: [
      { id: nextId, name: names[0], type: [type], stage: 1, evoLevel: rand(14,18) },
      { id: nextId+1, name: names[1], type: [type], stage: 2, evoLevel: rand(32,38) },
      { id: nextId+2, name: names[2], type: [type], stage: 3, evoLevel: null },
    ]
  });
  nextId += 3;
}
// 15 chains * 3 = 45 monsters (nextId = 46)

// 20개 2단진화 체인
const twoStageTypes = [
  'fire','water','grass','earth','earth','electric','ice','wind',
  'poison','metal','light','dark','spirit','fighting','rock',
  'sound','cosmic','cosmic','normal','normal'
];
for (let t = 0; t < 20; t++) {
  const type = twoStageTypes[t];
  const namePool = NAMES[type];
  const nameSet = namePool[Math.min(1, namePool.length-1)] || [`${type}A`,`${type}B`];
  chains.push({
    monsters: [
      { id: nextId, name: nameSet[0] || `몬스터${nextId}`, type: [type], stage: 1, evoLevel: rand(18,28) },
      { id: nextId+1, name: nameSet[1] || `몬스터${nextId+1}`, type: [type], stage: 2, evoLevel: null },
    ]
  });
  nextId += 2;
}
// 45 + 40 = 85 monsters (nextId = 86)

// 5개 단독 몬스터 (일반)
const soloTypes = ['earth','wind','poison','cosmic','normal'];
for (let t = 0; t < 5; t++) {
  const type = soloTypes[t];
  const namePool = NAMES[type];
  const idx = Math.min(2, namePool.length-1);
  const nameSet = namePool[idx];
  chains.push({
    monsters: [
      { id: nextId, name: nameSet?.[0] || `몬스터${nextId}`, type: [type], stage: 0, evoLevel: null },
    ]
  });
  nextId += 1;
}
// 85 + 5 = 90 (nextId = 91)

// 10개 전설 몬스터
const legendaryDefs = [
  { name: '태양신수', type: ['fire','light'], shape: 'mythical' },
  { name: '심연해왕', type: ['water','dark'], shape: 'mythical' },
  { name: '세계수', type: ['grass','cosmic'], shape: 'elemental' },
  { name: '뇌제', type: ['electric','dragon'], shape: 'mythical' },
  { name: '시간지배자', type: ['cosmic','spirit'], shape: 'mythical' },
  { name: '공간창조자', type: ['cosmic','dragon'], shape: 'mythical' },
  { name: '혼돈의화신', type: ['dark','fighting'], shape: 'humanoid' },
  { name: '질서의수호자', type: ['light','metal'], shape: 'humanoid' },
  { name: '영원의불꽃', type: ['fire','spirit'], shape: 'elemental' },
  { name: '절대영도', type: ['ice','cosmic'], shape: 'elemental' },
];
for (let i = 0; i < 10; i++) {
  chains.push({
    monsters: [{
      id: 91 + i,
      name: legendaryDefs[i].name,
      type: legendaryDefs[i].type,
      stage: -1, // legendary
      evoLevel: null,
      shape: legendaryDefs[i].shape,
      legendary: true,
    }]
  });
}

// ─── 몬스터 JSON 생성 ───
function genBaseStats(stage, legendary = false) {
  if (legendary) {
    const total = rand(570, 620);
    const spread = [rand(90,120), rand(90,130), rand(80,120), rand(90,130), rand(80,120), rand(80,120)];
    const sum = spread.reduce((a,b) => a+b);
    const scaled = spread.map(v => Math.round(v * total / sum));
    return { hp: scaled[0], atk: scaled[1], def: scaled[2], spAtk: scaled[3], spDef: scaled[4], speed: scaled[5] };
  }
  const totals = { 1: rand(280,320), 2: rand(380,420), 3: rand(480,540), 0: rand(420,470) };
  const total = totals[stage] || 400;
  const spread = [rand(35,80), rand(35,80), rand(35,80), rand(35,80), rand(35,80), rand(35,80)];
  const sum = spread.reduce((a,b) => a+b);
  const scaled = spread.map(v => Math.max(20, Math.round(v * total / sum)));
  return { hp: scaled[0], atk: scaled[1], def: scaled[2], spAtk: scaled[3], spDef: scaled[4], speed: scaled[5] };
}

function genLearnset(type, types, stage) {
  const levels = [];
  const skillPool = [];
  for (const t of types) {
    if (skillsByType[t]) skillPool.push(...skillsByType[t]);
  }
  // normal 스킬 추가
  skillPool.push(...(normalSkills.slice(0,5)));

  // 중복 제거
  const unique = [...new Set(skillPool)];
  if (unique.length === 0) unique.push('tackle');

  // 레벨별 스킬 배분
  const count = rand(8, 12);
  const used = new Set();
  for (let i = 0; i < count; i++) {
    const lv = i === 0 ? 1 : rand(1 + i * 4, 5 + i * 6);
    let skillId;
    let attempts = 0;
    do {
      skillId = pick(unique);
      attempts++;
    } while (used.has(skillId) && attempts < 30);
    used.add(skillId);
    levels.push({ level: Math.min(lv, 80), skillId });
  }
  levels.sort((a,b) => a.level - b.level);
  // 첫 스킬은 반드시 레벨1
  if (levels.length > 0) levels[0].level = 1;
  return levels;
}

const descriptions = {
  fire: ['온몸에서 불꽃이 타오르는 ', '뜨거운 화염을 내뿜는 ', '용암처럼 뜨거운 체온의 '],
  water: ['맑은 물속에서 사는 ', '강력한 물줄기를 뿜는 ', '깊은 바다를 지배하는 '],
  grass: ['식물의 힘을 가진 ', '햇빛을 먹고 자라는 ', '숲의 수호자인 '],
  electric: ['전기를 뿜는 ', '번개를 조종하는 ', '고압 전류를 다루는 '],
  earth: ['땅속에서 사는 ', '지진을 일으키는 ', '대지의 힘을 가진 '],
  ice: ['극한의 추위를 견디는 ', '모든 것을 얼리는 ', '빙하에서 태어난 '],
  wind: ['바람을 타고 나는 ', '폭풍을 일으키는 ', '자유로운 하늘의 '],
  poison: ['맹독을 가진 ', '독안개를 뿜는 ', '치명적인 독소의 '],
  metal: ['강철 같은 몸을 가진 ', '금속을 조종하는 ', '파괴할 수 없는 '],
  light: ['빛을 발하는 ', '신성한 광명의 ', '세상을 밝히는 '],
  dark: ['어둠 속에 숨는 ', '암흑을 지배하는 ', '그림자처럼 움직이는 '],
  spirit: ['영계를 넘나드는 ', '혼령의 힘을 가진 ', '사후세계에서 온 '],
  dragon: ['고대의 힘을 가진 ', '하늘을 나는 위엄의 ', '전설 속의 '],
  fighting: ['강인한 근력의 ', '무술을 익힌 ', '최강의 전사인 '],
  rock: ['단단한 바위로 된 ', '산을 무너뜨리는 ', '고대 화석에서 깨어난 '],
  sound: ['아름다운 음색의 ', '초음파를 발사하는 ', '폭음을 내지르는 '],
  cosmic: ['우주에서 온 ', '별의 힘을 가진 ', '은하를 여행하는 '],
  normal: ['평범해 보이지만 강한 ', '어디서나 볼 수 있는 ', '예측할 수 없는 '],
};

const suffixes = ['몬스터.', '생명체.', '존재.', '포켓몬스터.', '크리처.'];

const monsters = [];
for (const chain of chains) {
  for (let mi = 0; mi < chain.monsters.length; mi++) {
    const m = chain.monsters[mi];
    const mainType = m.type[0];
    const legendary = m.legendary || false;
    const bs = genBaseStats(m.stage, legendary);
    const learnset = genLearnset(mainType, m.type, m.stage);

    // 고유기술 ID (unique_ prefix)
    const uniqueSkillPool = skillsDB.filter(s => s.id.startsWith('unique_') && m.type.includes(s.type));
    let uniqueSkillId = uniqueSkillPool.length > 0 ? pick(uniqueSkillPool).id : null;
    // 만약 고유기술이 없으면 해당 타입의 가장 강한 일반 스킬
    if (!uniqueSkillId) {
      const typeSkills = skillsDB.filter(s => m.type.includes(s.type) && s.power >= 80);
      uniqueSkillId = typeSkills.length > 0 ? pick(typeSkills).id : (learnset.length > 0 ? learnset[learnset.length-1].skillId : 'tackle');
    }
    const uniqueLevel = legendary ? rand(50,70) : m.stage === 3 ? rand(40,55) : m.stage === 2 ? rand(28,38) : rand(25,35);

    const baseColor = pick(COLORS[mainType] || COLORS.normal);
    const accentColor = pick(ACCENT_COLORS);
    const shape = m.shape || pick(SHAPES);
    const features = [];
    const numFeatures = rand(1, 3);
    const featPool = [...FEATURES_POOL];
    for (let f = 0; f < numFeatures; f++) {
      const fi = Math.floor(Math.random() * featPool.length);
      features.push(featPool.splice(fi, 1)[0]);
    }

    const descPrefix = pick(descriptions[mainType] || descriptions.normal);
    const descSuffix = pick(suffixes);

    const evolution = m.evoLevel ? { to: chain.monsters[mi+1].id, level: m.evoLevel } : null;
    const catchRate = legendary ? rand(3, 10) : m.stage === 3 ? rand(30, 60) : m.stage === 2 ? rand(60, 120) : m.stage === 0 ? rand(80, 150) : rand(150, 255);
    const expYield = legendary ? rand(280, 350) : m.stage === 3 ? rand(200, 270) : m.stage === 2 ? rand(130, 180) : m.stage === 0 ? rand(150, 200) : rand(50, 90);
    const growthRate = legendary ? 'slow' : pick(['fast', 'medium', 'medium', 'slow']);

    monsters.push({
      id: m.id,
      name: m.name,
      type: m.type,
      baseStats: bs,
      growthRate,
      learnset,
      uniqueSkill: { level: uniqueLevel, skillId: uniqueSkillId },
      evolution,
      catchRate,
      expYield,
      description: `${descPrefix}${m.name}은(는) ${m.type.map(t=>({fire:'화염',water:'해류',grass:'자연',electric:'전격',earth:'대지',ice:'빙결',wind:'질풍',poison:'맹독',metal:'강철',light:'광명',dark:'암흑',spirit:'영혼',dragon:'용린',fighting:'투지',rock:'암석',sound:'음파',cosmic:'우주',normal:'무속성'}[t]||t)).join('·')} 타입 ${descSuffix}`,
      spriteConfig: { baseColor, accentColor, shape, features },
    });
  }
}

writeFileSync(join(DATA_DIR, 'monsters.json'), JSON.stringify(monsters, null, 2), 'utf-8');
console.log(`✅ monsters.json: ${monsters.length}종 생성 완료`);

// ─── maps.json 생성 ───
const mapsData = {
  locations: [
    // 마을 8개
    { id: 'town_01', name: '시작의 마을', type: 'town', description: '모험이 시작되는 평화로운 마을',
      connections: [{ to: 'route_01' }], encounters: null, trainers: null, gym: null,
      shop: [{ itemId: 'potion', stock: -1 }, { itemId: 'capsule_ball', stock: -1 }],
      events: null, requiredBadges: 0, wildEncounterRate: 0 },

    { id: 'town_02', name: '푸른숲 마을', type: 'town', description: '울창한 숲 한가운데의 마을',
      connections: [{ to: 'route_01' }, { to: 'route_02' }, { to: 'gym_01' }],
      encounters: null, trainers: null, gym: null,
      shop: [{ itemId: 'potion', stock: -1 }, { itemId: 'capsule_ball', stock: -1 }, { itemId: 'antidote', stock: -1 }],
      events: null, requiredBadges: 0, wildEncounterRate: 0 },

    { id: 'town_03', name: '바위산 마을', type: 'town', description: '험준한 산 아래 위치한 마을',
      connections: [{ to: 'route_02' }, { to: 'route_03' }, { to: 'gym_02' }, { to: 'cave_01' }],
      encounters: null, trainers: null, gym: null,
      shop: [{ itemId: 'potion', stock: -1 }, { itemId: 'super_potion', stock: -1 }, { itemId: 'capsule_ball', stock: -1 }, { itemId: 'high_ball', stock: -1 }],
      events: null, requiredBadges: 1, wildEncounterRate: 0 },

    { id: 'town_04', name: '호수 도시', type: 'town', description: '아름다운 호수 옆의 번화한 도시',
      connections: [{ to: 'route_03' }, { to: 'route_04' }, { to: 'gym_03' }],
      encounters: null, trainers: null, gym: null,
      shop: [{ itemId: 'super_potion', stock: -1 }, { itemId: 'high_ball', stock: -1 }, { itemId: 'status_heal', stock: -1 }, { itemId: 'revive', stock: -1 }],
      events: null, requiredBadges: 2, wildEncounterRate: 0 },

    { id: 'town_05', name: '항구 도시', type: 'town', description: '바다와 접한 활기 넘치는 항구',
      connections: [{ to: 'route_04' }, { to: 'route_05' }, { to: 'gym_04' }],
      encounters: null, trainers: null, gym: null,
      shop: [{ itemId: 'super_potion', stock: -1 }, { itemId: 'high_ball', stock: -1 }, { itemId: 'status_heal', stock: -1 }, { itemId: 'pp_restore', stock: -1 }],
      events: null, requiredBadges: 3, wildEncounterRate: 0 },

    { id: 'town_06', name: '사막 오아시스', type: 'town', description: '넓은 사막 한가운데의 오아시스',
      connections: [{ to: 'route_05' }, { to: 'route_06' }, { to: 'gym_05' }],
      encounters: null, trainers: null, gym: null,
      shop: [{ itemId: 'hyper_potion', stock: -1 }, { itemId: 'ultra_ball', stock: -1 }, { itemId: 'revive', stock: -1 }],
      events: null, requiredBadges: 4, wildEncounterRate: 0 },

    { id: 'town_07', name: '설산 마을', type: 'town', description: '만년설로 뒤덮인 산꼭대기 마을',
      connections: [{ to: 'route_06' }, { to: 'route_07' }, { to: 'gym_06' }, { to: 'cave_02' }],
      encounters: null, trainers: null, gym: null,
      shop: [{ itemId: 'hyper_potion', stock: -1 }, { itemId: 'ultra_ball', stock: -1 }, { itemId: 'full_restore', stock: -1 }, { itemId: 'revive', stock: -1 }],
      events: null, requiredBadges: 5, wildEncounterRate: 0 },

    { id: 'town_08', name: '왕도', type: 'town', description: '몬스터 리그 본부가 있는 최대 도시',
      connections: [{ to: 'route_07' }, { to: 'gym_07' }, { to: 'gym_08' }, { to: 'elite_four' }],
      encounters: null, trainers: null, gym: null,
      shop: [{ itemId: 'hyper_potion', stock: -1 }, { itemId: 'full_restore', stock: -1 }, { itemId: 'ultra_ball', stock: -1 }, { itemId: 'max_revive', stock: -1 }, { itemId: 'pp_restore', stock: -1 }],
      events: null, requiredBadges: 6, wildEncounterRate: 0 },

    // 루트 7개
    { id: 'route_01', name: '1번 도로', type: 'route', description: '시작 마을에서 푸른숲 마을로 이어지는 길',
      connections: [{ to: 'town_01' }, { to: 'town_02' }],
      encounters: [
        { monsterId: 82, minLevel: 2, maxLevel: 5, weight: 30 },
        { monsterId: 86, minLevel: 2, maxLevel: 4, weight: 30 },
        { monsterId: 46, minLevel: 3, maxLevel: 5, weight: 20 },
        { monsterId: 84, minLevel: 3, maxLevel: 5, weight: 20 },
      ],
      trainers: [
        { id: 'trainer_r1_1', name: '훈련생 민수', team: [{ monsterId: 86, level: 4 }], reward: 120 },
        { id: 'trainer_r1_2', name: '소녀 지은', team: [{ monsterId: 82, level: 3 }, { monsterId: 46, level: 4 }], reward: 160 },
      ],
      gym: null, shop: null, events: null, requiredBadges: 0, wildEncounterRate: 0.18 },

    { id: 'route_02', name: '2번 도로', type: 'route', description: '숲을 지나 바위산으로 향하는 길',
      connections: [{ to: 'town_02' }, { to: 'town_03' }],
      encounters: [
        { monsterId: 10, minLevel: 8, maxLevel: 11, weight: 25 },
        { monsterId: 22, minLevel: 7, maxLevel: 10, weight: 25 },
        { monsterId: 48, minLevel: 8, maxLevel: 11, weight: 25 },
        { monsterId: 58, minLevel: 9, maxLevel: 12, weight: 25 },
      ],
      trainers: [
        { id: 'trainer_r2_1', name: '산악인 철수', team: [{ monsterId: 22, level: 10 }, { monsterId: 58, level: 11 }], reward: 300 },
        { id: 'trainer_r2_2', name: '벌레잡이 영희', team: [{ monsterId: 48, level: 9 }, { monsterId: 48, level: 9 }, { monsterId: 10, level: 10 }], reward: 280 },
      ],
      gym: null, shop: null, events: null, requiredBadges: 1, wildEncounterRate: 0.20 },

    { id: 'route_03', name: '3번 도로', type: 'route', description: '호수를 따라 이어지는 수변 도로',
      connections: [{ to: 'town_03' }, { to: 'town_04' }],
      encounters: [
        { monsterId: 4, minLevel: 14, maxLevel: 17, weight: 20 },
        { monsterId: 50, minLevel: 13, maxLevel: 16, weight: 25 },
        { monsterId: 52, minLevel: 14, maxLevel: 17, weight: 25 },
        { monsterId: 66, minLevel: 15, maxLevel: 18, weight: 15 },
        { monsterId: 70, minLevel: 14, maxLevel: 16, weight: 15 },
      ],
      trainers: [
        { id: 'trainer_r3_1', name: '낚시꾼 동현', team: [{ monsterId: 4, level: 15 }, { monsterId: 50, level: 16 }], reward: 500 },
        { id: 'trainer_r3_2', name: '수영선수 수진', team: [{ monsterId: 52, level: 16 }, { monsterId: 4, level: 17 }], reward: 550 },
      ],
      gym: null, shop: null, events: null, requiredBadges: 2, wildEncounterRate: 0.18 },

    { id: 'route_04', name: '4번 도로', type: 'route', description: '항구로 향하는 해안 절벽 도로',
      connections: [{ to: 'town_04' }, { to: 'town_05' }],
      encounters: [
        { monsterId: 19, minLevel: 20, maxLevel: 24, weight: 20 },
        { monsterId: 25, minLevel: 20, maxLevel: 23, weight: 20 },
        { monsterId: 54, minLevel: 21, maxLevel: 24, weight: 20 },
        { monsterId: 62, minLevel: 20, maxLevel: 24, weight: 20 },
        { monsterId: 72, minLevel: 22, maxLevel: 25, weight: 20 },
      ],
      trainers: [
        { id: 'trainer_r4_1', name: '격투가 태권', team: [{ monsterId: 40, level: 23 }, { monsterId: 41, level: 24 }], reward: 750 },
        { id: 'trainer_r4_2', name: '등산가 미영', team: [{ monsterId: 25, level: 22 }, { monsterId: 19, level: 23 }, { monsterId: 54, level: 24 }], reward: 800 },
      ],
      gym: null, shop: null, events: null, requiredBadges: 3, wildEncounterRate: 0.18 },

    { id: 'route_05', name: '5번 도로', type: 'route', description: '사막으로 이어지는 건조한 길',
      connections: [{ to: 'town_05' }, { to: 'town_06' }],
      encounters: [
        { monsterId: 16, minLevel: 27, maxLevel: 31, weight: 20 },
        { monsterId: 56, minLevel: 27, maxLevel: 30, weight: 20 },
        { monsterId: 60, minLevel: 28, maxLevel: 31, weight: 20 },
        { monsterId: 64, minLevel: 28, maxLevel: 32, weight: 20 },
        { monsterId: 74, minLevel: 29, maxLevel: 32, weight: 20 },
      ],
      trainers: [
        { id: 'trainer_r5_1', name: '사막여행자 한솔', team: [{ monsterId: 16, level: 29 }, { monsterId: 56, level: 30 }, { monsterId: 60, level: 30 }], reward: 1000 },
      ],
      gym: null, shop: null, events: null, requiredBadges: 4, wildEncounterRate: 0.22 },

    { id: 'route_06', name: '6번 도로', type: 'route', description: '설산으로 오르는 산길',
      connections: [{ to: 'town_06' }, { to: 'town_07' }],
      encounters: [
        { monsterId: 19, minLevel: 33, maxLevel: 37, weight: 15 },
        { monsterId: 68, minLevel: 34, maxLevel: 37, weight: 20 },
        { monsterId: 76, minLevel: 34, maxLevel: 38, weight: 20 },
        { monsterId: 78, minLevel: 35, maxLevel: 38, weight: 20 },
        { monsterId: 80, minLevel: 35, maxLevel: 39, weight: 25 },
      ],
      trainers: [
        { id: 'trainer_r6_1', name: '스키어 유나', team: [{ monsterId: 19, level: 35 }, { monsterId: 68, level: 36 }, { monsterId: 20, level: 37 }], reward: 1200 },
        { id: 'trainer_r6_2', name: '등반가 석진', team: [{ monsterId: 76, level: 36 }, { monsterId: 78, level: 37 }], reward: 1100 },
      ],
      gym: null, shop: null, events: null, requiredBadges: 5, wildEncounterRate: 0.20 },

    { id: 'route_07', name: '7번 도로', type: 'route', description: '왕도로 향하는 최종 도로',
      connections: [{ to: 'town_07' }, { to: 'town_08' }],
      encounters: [
        { monsterId: 38, minLevel: 38, maxLevel: 42, weight: 15 },
        { monsterId: 41, minLevel: 39, maxLevel: 43, weight: 20 },
        { monsterId: 44, minLevel: 39, maxLevel: 43, weight: 20 },
        { monsterId: 80, minLevel: 40, maxLevel: 44, weight: 20 },
        { monsterId: 89, minLevel: 38, maxLevel: 42, weight: 25 },
      ],
      trainers: [
        { id: 'trainer_r7_1', name: '베테랑 현우', team: [{ monsterId: 38, level: 40 }, { monsterId: 41, level: 41 }, { monsterId: 44, level: 42 }, { monsterId: 89, level: 43 }], reward: 2000 },
      ],
      gym: null, shop: null, events: null, requiredBadges: 6, wildEncounterRate: 0.20 },

    // 동굴/특수 지역
    { id: 'cave_01', name: '어둠의 동굴', type: 'cave', description: '바위산 깊은 곳의 미스터리한 동굴',
      connections: [{ to: 'town_03' }],
      encounters: [
        { monsterId: 31, minLevel: 12, maxLevel: 16, weight: 25 },
        { monsterId: 34, minLevel: 13, maxLevel: 17, weight: 25 },
        { monsterId: 43, minLevel: 14, maxLevel: 18, weight: 25 },
        { monsterId: 58, minLevel: 12, maxLevel: 15, weight: 25 },
      ],
      trainers: [
        { id: 'trainer_cave1_1', name: '탐험가 준혁', team: [{ monsterId: 31, level: 15 }, { monsterId: 34, level: 16 }], reward: 400 },
      ],
      gym: null, shop: null, events: null, requiredBadges: 2, wildEncounterRate: 0.25 },

    { id: 'cave_02', name: '결정 동굴', type: 'cave', description: '아름다운 수정으로 가득한 동굴',
      connections: [{ to: 'town_07' }],
      encounters: [
        { monsterId: 28, minLevel: 35, maxLevel: 40, weight: 20 },
        { monsterId: 38, minLevel: 36, maxLevel: 41, weight: 20 },
        { monsterId: 44, minLevel: 37, maxLevel: 42, weight: 20 },
        { monsterId: 80, minLevel: 38, maxLevel: 43, weight: 20 },
        { monsterId: 88, minLevel: 38, maxLevel: 42, weight: 20 },
      ],
      trainers: [
        { id: 'trainer_cave2_1', name: '보석수집가 보라', team: [{ monsterId: 28, level: 38 }, { monsterId: 44, level: 39 }, { monsterId: 88, level: 40 }], reward: 1500 },
      ],
      gym: null, shop: null, events: null, requiredBadges: 6, wildEncounterRate: 0.25 },

    // 체육관 8개
    { id: 'gym_01', name: '풀빛 체육관', type: 'gym', description: '자연 타입 전문 체육관',
      connections: [{ to: 'town_02' }],
      encounters: null,
      trainers: [
        { id: 'gym1_trainer1', name: '체육관 훈련생 A', team: [{ monsterId: 7, level: 10 }, { monsterId: 46, level: 10 }], reward: 300 },
      ],
      gym: { leader: '초록', type: 'grass', badge: 'badge_grass',
        team: [{ monsterId: 7, level: 12 }, { monsterId: 8, level: 13 }, { monsterId: 46, level: 14 }], reward: 1500 },
      shop: null, events: null, requiredBadges: 0, wildEncounterRate: 0 },

    { id: 'gym_02', name: '암석 체육관', type: 'gym', description: '암석 타입 전문 체육관',
      connections: [{ to: 'town_03' }],
      encounters: null,
      trainers: [
        { id: 'gym2_trainer1', name: '체육관 훈련생 B', team: [{ monsterId: 43, level: 14 }, { monsterId: 58, level: 15 }], reward: 450 },
      ],
      gym: { leader: '석진', type: 'rock', badge: 'badge_rock',
        team: [{ monsterId: 43, level: 17 }, { monsterId: 58, level: 18 }, { monsterId: 44, level: 19 }], reward: 2000 },
      shop: null, events: null, requiredBadges: 1, wildEncounterRate: 0 },

    { id: 'gym_03', name: '파도 체육관', type: 'gym', description: '해류 타입 전문 체육관',
      connections: [{ to: 'town_04' }],
      encounters: null,
      trainers: [
        { id: 'gym3_trainer1', name: '체육관 훈련생 C', team: [{ monsterId: 4, level: 20 }, { monsterId: 50, level: 21 }], reward: 600 },
      ],
      gym: { leader: '미나', type: 'water', badge: 'badge_water',
        team: [{ monsterId: 4, level: 23 }, { monsterId: 5, level: 24 }, { monsterId: 52, level: 25 }], reward: 2500 },
      shop: null, events: null, requiredBadges: 2, wildEncounterRate: 0 },

    { id: 'gym_04', name: '번개 체육관', type: 'gym', description: '전격 타입 전문 체육관',
      connections: [{ to: 'town_05' }],
      encounters: null,
      trainers: [
        { id: 'gym4_trainer1', name: '체육관 훈련생 D', team: [{ monsterId: 10, level: 26 }, { monsterId: 54, level: 27 }], reward: 800 },
      ],
      gym: { leader: '라이', type: 'electric', badge: 'badge_electric',
        team: [{ monsterId: 10, level: 28 }, { monsterId: 11, level: 29 }, { monsterId: 54, level: 30 }], reward: 3000 },
      shop: null, events: null, requiredBadges: 3, wildEncounterRate: 0 },

    { id: 'gym_05', name: '투지 체육관', type: 'gym', description: '투지 타입 전문 체육관',
      connections: [{ to: 'town_06' }],
      encounters: null,
      trainers: [
        { id: 'gym5_trainer1', name: '체육관 훈련생 E', team: [{ monsterId: 40, level: 31 }, { monsterId: 64, level: 32 }], reward: 1000 },
      ],
      gym: { leader: '무현', type: 'fighting', badge: 'badge_fighting',
        team: [{ monsterId: 40, level: 33 }, { monsterId: 41, level: 34 }, { monsterId: 64, level: 35 }], reward: 3500 },
      shop: null, events: null, requiredBadges: 4, wildEncounterRate: 0 },

    { id: 'gym_06', name: '빙하 체육관', type: 'gym', description: '빙결 타입 전문 체육관',
      connections: [{ to: 'town_07' }],
      encounters: null,
      trainers: [
        { id: 'gym6_trainer1', name: '체육관 훈련생 F', team: [{ monsterId: 16, level: 36 }, { monsterId: 68, level: 37 }], reward: 1200 },
      ],
      gym: { leader: '설화', type: 'ice', badge: 'badge_ice',
        team: [{ monsterId: 16, level: 38 }, { monsterId: 17, level: 39 }, { monsterId: 68, level: 40 }, { monsterId: 18, level: 41 }], reward: 4000 },
      shop: null, events: null, requiredBadges: 5, wildEncounterRate: 0 },

    { id: 'gym_07', name: '용린 체육관', type: 'gym', description: '용린 타입 전문 체육관',
      connections: [{ to: 'town_08' }],
      encounters: null,
      trainers: [
        { id: 'gym7_trainer1', name: '체육관 훈련생 G', team: [{ monsterId: 37, level: 42 }, { monsterId: 38, level: 43 }], reward: 1500 },
      ],
      gym: { leader: '용왕', type: 'dragon', badge: 'badge_dragon',
        team: [{ monsterId: 37, level: 44 }, { monsterId: 38, level: 45 }, { monsterId: 80, level: 46 }, { monsterId: 39, level: 48 }], reward: 5000 },
      shop: null, events: null, requiredBadges: 6, wildEncounterRate: 0 },

    { id: 'gym_08', name: '우주 체육관', type: 'gym', description: '우주 타입 전문 체육관',
      connections: [{ to: 'town_08' }],
      encounters: null,
      trainers: [
        { id: 'gym8_trainer1', name: '체육관 훈련생 H', team: [{ monsterId: 76, level: 47 }, { monsterId: 78, level: 48 }], reward: 1800 },
      ],
      gym: { leader: '성운', type: 'cosmic', badge: 'badge_cosmic',
        team: [{ monsterId: 76, level: 49 }, { monsterId: 78, level: 50 }, { monsterId: 80, level: 51 }, { monsterId: 77, level: 53 }], reward: 6000 },
      shop: null, events: null, requiredBadges: 7, wildEncounterRate: 0 },

    // 사천왕 + 챔피언
    { id: 'elite_four', name: '포켓 리그', type: 'elite_four', description: '최강의 트레이너들이 기다리는 곳',
      connections: [{ to: 'town_08' }],
      encounters: null,
      trainers: [
        { id: 'elite_1', name: '사천왕 암흑의 카이', team: [
          { monsterId: 31, level: 52 }, { monsterId: 32, level: 53 }, { monsterId: 33, level: 54 }, { monsterId: 66, level: 55 }
        ], reward: 5000 },
        { id: 'elite_2', name: '사천왕 강철의 하나', team: [
          { monsterId: 25, level: 53 }, { monsterId: 26, level: 54 }, { monsterId: 27, level: 55 }, { monsterId: 62, level: 56 }
        ], reward: 5000 },
        { id: 'elite_3', name: '사천왕 영혼의 유령', team: [
          { monsterId: 34, level: 54 }, { monsterId: 35, level: 55 }, { monsterId: 36, level: 56 }, { monsterId: 70, level: 57 }
        ], reward: 5000 },
        { id: 'elite_4', name: '사천왕 용린의 태수', team: [
          { monsterId: 37, level: 55 }, { monsterId: 38, level: 56 }, { monsterId: 39, level: 57 }, { monsterId: 80, level: 58 }
        ], reward: 5000 },
        { id: 'champion', name: '챔피언 레온', team: [
          { monsterId: 3, level: 58 }, { monsterId: 6, level: 58 }, { monsterId: 9, level: 58 },
          { monsterId: 12, level: 59 }, { monsterId: 39, level: 60 }, { monsterId: 91, level: 62 }
        ], reward: 20000 },
      ],
      gym: null, shop: null, events: null, requiredBadges: 8, wildEncounterRate: 0 },
  ]
};

writeFileSync(join(DATA_DIR, 'maps.json'), JSON.stringify(mapsData, null, 2), 'utf-8');
console.log('✅ maps.json 생성 완료');

// ─── story.json 생성 ───
const storyData = {
  chapters: [
    {
      chapter: 1, title: '여행의 시작',
      events: [
        { id: 'ch1_start', locationId: 'town_01', requires: [],
          scenes: [
            { type: 'dialog', speaker: '한 박사', text: '어서 오게, 젊은 트레이너여! 이 세계에는 몬스터라 불리는 신비한 생물들이 살고 있단다.' },
            { type: 'dialog', speaker: '한 박사', text: '자네에게 첫 파트너 몬스터를 주겠네. 잘 선택하게!' },
            { type: 'choice', text: '어떤 파트너를 선택하겠는가?', options: [
              { text: '염동이 (화염 타입)', result: { give_monster: 1, level: 5 } },
              { text: '물방울 (해류 타입)', result: { give_monster: 4, level: 5 } },
              { text: '새싹이 (자연 타입)', result: { give_monster: 7, level: 5 } },
            ]},
            { type: 'dialog', speaker: '한 박사', text: '좋은 선택이야! 이 도감도 받게. 세상의 모든 몬스터를 기록해 보게나.' },
            { type: 'dialog', speaker: '한 박사', text: '그리고... 최근 "그림자단"이라는 수상한 조직이 활동하고 있다네. 조심하게.' },
            { type: 'dialog', speaker: '???', text: '흥, 나도 몬스터를 받으러 왔는데... 어디 실력 한번 볼까?' },
            { type: 'dialog', speaker: '한 박사', text: '아, 네 라이벌 진이로군! 좋아, 한번 겨뤄봐라!' },
          ]
        },
        { id: 'ch1_rival1', locationId: 'town_01', requires: ['ch1_start'],
          scenes: [
            { type: 'dialog', speaker: '라이벌 진', text: '가자! 누가 더 강한지 보여주겠어!' },
            { type: 'battle', trainerName: '라이벌 진', team: [{ monsterId: 82, level: 5 }], reward: 300 },
            { type: 'dialog', speaker: '라이벌 진', text: '이번엔 졌지만... 다음엔 반드시 이길 거야!' },
            { type: 'dialog', speaker: '한 박사', text: '멋진 배틀이었어! 이제 모험을 떠나거라. 첫 번째 체육관은 푸른숲 마을에 있단다.' },
          ]
        },
      ]
    },
    {
      chapter: 2, title: '첫 번째 배지',
      events: [
        { id: 'ch2_gym1_pre', locationId: 'gym_01', requires: [],
          scenes: [
            { type: 'dialog', speaker: '체육관장 초록', text: '어서 와, 도전자! 자연의 힘을 보여주마!' },
          ]
        },
      ]
    },
    {
      chapter: 3, title: '그림자단의 그림자',
      events: [
        { id: 'ch3_shadow1', locationId: 'town_03', requires: [],
          scenes: [
            { type: 'dialog', speaker: '???', text: '쉿... 그림자단 조직원들이 동굴에서 뭔가 찾고 있다는 소문이야.' },
            { type: 'dialog', speaker: '주민', text: '어둠의 동굴에서 이상한 소리가 난다더라...' },
          ]
        },
        { id: 'ch3_cave_event', locationId: 'cave_01', requires: ['ch3_shadow1'],
          scenes: [
            { type: 'dialog', speaker: '그림자단 조직원', text: '뭐야, 꼬마가 여기까지 왔어? 물러서!' },
            { type: 'battle', trainerName: '그림자단 조직원', team: [{ monsterId: 22, level: 15 }, { monsterId: 31, level: 16 }], reward: 500 },
            { type: 'dialog', speaker: '그림자단 조직원', text: '크윽... 이번엔 봐주겠다!' },
            { type: 'dialog', speaker: null, text: '그림자단은 전설의 몬스터의 힘을 노리고 있는 것 같다...' },
          ]
        },
      ]
    },
    {
      chapter: 4, title: '물의 도시',
      events: [
        { id: 'ch4_rival2', locationId: 'town_04', requires: [],
          scenes: [
            { type: 'dialog', speaker: '라이벌 진', text: '여기서 만나다니! 내가 얼마나 강해졌는지 보여줄게!' },
            { type: 'battle', trainerName: '라이벌 진', team: [
              { monsterId: 83, level: 24 }, { monsterId: 50, level: 23 }, { monsterId: 10, level: 23 }
            ], reward: 1200 },
            { type: 'dialog', speaker: '라이벌 진', text: '역시 강하군... 하지만 난 포기하지 않아!' },
          ]
        },
      ]
    },
    {
      chapter: 5, title: '폭풍의 전조',
      events: [
        { id: 'ch5_shadow2', locationId: 'town_05', requires: [],
          scenes: [
            { type: 'dialog', speaker: '선원', text: '항구 근처에서 수상한 놈들이 배를 빼돌리고 있어!' },
            { type: 'dialog', speaker: '그림자단 간부', text: '훗, 또 너냐? 이번에도 방해할 셈이냐?' },
            { type: 'battle', trainerName: '그림자단 간부 섀도', team: [
              { monsterId: 31, level: 28 }, { monsterId: 32, level: 29 }, { monsterId: 22, level: 30 }
            ], reward: 1500 },
            { type: 'dialog', speaker: '그림자단 간부', text: '우리의 계획은 이미 진행 중이다... 네가 막을 수 있을까?' },
          ]
        },
      ]
    },
    {
      chapter: 6, title: '사막의 비밀',
      events: [
        { id: 'ch6_legendary_hint', locationId: 'town_06', requires: [],
          scenes: [
            { type: 'dialog', speaker: '장로', text: '이 사막 깊은 곳에 태양의 몬스터가 잠들어 있다는 전설이 있지...' },
            { type: 'dialog', speaker: '장로', text: '그림자단이 그 힘을 노리고 있다면 큰일이야. 자네가 막아줘야 하네.' },
          ]
        },
      ]
    },
    {
      chapter: 7, title: '얼어붙은 진실',
      events: [
        { id: 'ch7_rival3', locationId: 'town_07', requires: [],
          scenes: [
            { type: 'dialog', speaker: '라이벌 진', text: '여기까지 왔군... 나도 많이 강해졌어. 받아라!' },
            { type: 'battle', trainerName: '라이벌 진', team: [
              { monsterId: 84, level: 38 }, { monsterId: 51, level: 37 },
              { monsterId: 11, level: 37 }, { monsterId: 62, level: 38 }
            ], reward: 2500 },
            { type: 'dialog', speaker: '라이벌 진', text: '그림자단의 본거지가 왕도 근처라는 소문이야. 같이 막자!' },
          ]
        },
      ]
    },
    {
      chapter: 8, title: '최후의 결전',
      events: [
        { id: 'ch8_shadow_boss', locationId: 'town_08', requires: [],
          scenes: [
            { type: 'dialog', speaker: '그림자단 보스', text: '드디어 왔군. 전설의 몬스터의 힘은 이미 내 것이다!' },
            { type: 'battle', trainerName: '그림자단 보스 다크', team: [
              { monsterId: 33, level: 48 }, { monsterId: 36, level: 48 },
              { monsterId: 27, level: 49 }, { monsterId: 39, level: 50 },
              { monsterId: 97, level: 52 }
            ], reward: 10000 },
            { type: 'dialog', speaker: '그림자단 보스', text: '이럴 수가... 네 놈의 몬스터와의 유대가 이 정도란 말인가...' },
            { type: 'dialog', speaker: null, text: '그림자단은 해산되었다! 이제 남은 건 포켓 리그 도전뿐!' },
          ]
        },
        { id: 'ch8_champion_pre', locationId: 'elite_four', requires: ['ch8_shadow_boss'],
          scenes: [
            { type: 'dialog', speaker: null, text: '포켓 리그에 오신 것을 환영합니다! 사천왕과 챔피언을 모두 이기면 당신이 새로운 챔피언!' },
          ]
        },
      ]
    },
    {
      chapter: 9, title: '새로운 챔피언',
      events: [
        { id: 'ch9_ending', locationId: 'elite_four', requires: [],
          scenes: [
            { type: 'dialog', speaker: null, text: '축하합니다! 당신이 새로운 챔피언입니다!' },
            { type: 'dialog', speaker: '한 박사', text: '정말 대단하구나! 네 여정은 많은 이들에게 희망이 되었어.' },
            { type: 'dialog', speaker: null, text: '하지만 모험은 아직 끝나지 않았다... 아직 만나지 못한 몬스터들이 기다리고 있다!' },
          ]
        },
      ]
    },
  ]
};

writeFileSync(join(DATA_DIR, 'story.json'), JSON.stringify(storyData, null, 2), 'utf-8');
console.log('✅ story.json 생성 완료');

console.log('\n🎮 모든 데이터 생성 완료!');
