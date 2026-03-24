// 몬스터 인스턴스 관리

let monstersDB = null;
let skillsDB = null;

export async function loadMonsterDB() {
  const [mRes, sRes] = await Promise.all([
    fetch('./data/monsters.json'),
    fetch('./data/skills.json'),
  ]);
  const mData = await mRes.json();
  const sData = await sRes.json();
  monstersDB = Array.isArray(mData) ? mData : mData.monsters || [];
  skillsDB = Array.isArray(sData) ? sData : sData.skills || [];
  return { monstersDB, skillsDB };
}

export function getMonsterData(id) {
  return monstersDB?.find(m => m.id === id);
}

export function getSkillData(id) {
  return skillsDB?.find(s => s.id === id);
}

export function getAllMonsters() {
  return monstersDB || [];
}

export function getAllSkills() {
  return skillsDB || [];
}

/** 경험치 테이블 — 레벨 n에 필요한 총 경험치 */
function expForLevel(level, growthRate) {
  const base = level * level * level;
  switch (growthRate) {
    case 'fast': return Math.floor(base * 0.8);
    case 'medium': return base;
    case 'slow': return Math.floor(base * 1.25);
    default: return base;
  }
}

/**
 * 몬스터 인스턴스 생성
 */
export function createMonster(monsterId, level, isWild = false) {
  const data = getMonsterData(monsterId);
  if (!data) throw new Error(`Monster ID ${monsterId} not found`);

  const monster = {
    uid: crypto.randomUUID(),
    id: data.id,
    name: data.name,
    nickname: null,
    type: [...data.type],
    level,
    exp: expForLevel(level, data.growthRate),
    growthRate: data.growthRate,
    isWild,

    // 스탯 계산 (개체값 포함)
    iv: {
      hp: Math.floor(Math.random() * 32),
      atk: Math.floor(Math.random() * 32),
      def: Math.floor(Math.random() * 32),
      spAtk: Math.floor(Math.random() * 32),
      spDef: Math.floor(Math.random() * 32),
      speed: Math.floor(Math.random() * 32),
    },
    ev: { hp: 0, atk: 0, def: 0, spAtk: 0, spDef: 0, speed: 0 },

    stats: {},
    currentHp: 0,
    status: null, // burn, poison, paralyze, sleep, confuse, freeze
    statusTurns: 0,

    skills: [],
    baseStats: { ...data.baseStats },
    evolution: data.evolution ? { ...data.evolution } : null,
    catchRate: data.catchRate,
    expYield: data.expYield,
    spriteConfig: data.spriteConfig,
    description: data.description,
  };

  // 스탯 계산
  recalcStats(monster);
  monster.currentHp = monster.stats.hp;

  // 레벨에 맞는 스킬 습득
  learnSkillsForLevel(monster, data);

  return monster;
}

/** HP 스탯 계산 */
function calcHpStat(base, iv, ev, level) {
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
}

/** 일반 스탯 계산 */
function calcStat(base, iv, ev, level) {
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
}

export function recalcStats(monster) {
  const lv = monster.level;
  const bs = monster.baseStats;
  const iv = monster.iv;
  const ev = monster.ev;

  monster.stats = {
    hp: calcHpStat(bs.hp, iv.hp, ev.hp, lv),
    atk: calcStat(bs.atk, iv.atk, ev.atk, lv),
    def: calcStat(bs.def, iv.def, ev.def, lv),
    spAtk: calcStat(bs.spAtk, iv.spAtk, ev.spAtk, lv),
    spDef: calcStat(bs.spDef, iv.spDef, ev.spDef, lv),
    speed: calcStat(bs.speed, iv.speed, ev.speed, lv),
  };
}

function learnSkillsForLevel(monster, data) {
  const learned = [];

  // 레벨셋에서 현재 레벨 이하의 스킬 수집
  for (const entry of data.learnset) {
    if (entry.level <= monster.level) {
      learned.push(entry.skillId);
    }
  }

  // 고유기술 체크
  if (data.uniqueSkill && data.uniqueSkill.level <= monster.level) {
    learned.push(data.uniqueSkill.skillId);
  }

  // 최근 5개 스킬만 장착 (가장 높은 레벨에서 배운 것 우선)
  const lastFive = learned.slice(-5);
  monster.skills = lastFive.map(skillId => {
    const skillData = getSkillData(skillId);
    return skillData ? {
      id: skillData.id,
      name: skillData.name,
      type: skillData.type,
      category: skillData.category,
      power: skillData.power,
      accuracy: skillData.accuracy,
      pp: skillData.pp,
      maxPp: skillData.pp,
      effect: skillData.effect,
      description: skillData.description,
    } : null;
  }).filter(Boolean);
}

/**
 * 경험치 획득 및 레벨업 처리
 * @returns {Array} 레벨업 이벤트 목록
 */
export function gainExp(monster, amount) {
  const events = [];
  monster.exp += amount;

  while (true) {
    const nextLevelExp = expForLevel(monster.level + 1, monster.growthRate);
    if (monster.exp < nextLevelExp || monster.level >= 100) break;

    monster.level++;
    const oldHp = monster.stats.hp;
    recalcStats(monster);
    const hpGain = monster.stats.hp - oldHp;
    monster.currentHp += hpGain;

    const levelEvent = { type: 'level_up', level: monster.level, newSkills: [], evolved: false };

    // 새 스킬 습득 체크
    const data = getMonsterData(monster.id);
    if (data) {
      for (const entry of data.learnset) {
        if (entry.level === monster.level) {
          const skillData = getSkillData(entry.skillId);
          if (skillData) {
            levelEvent.newSkills.push(skillData);
          }
        }
      }
      // 고유기술 체크
      if (data.uniqueSkill && data.uniqueSkill.level === monster.level) {
        const skillData = getSkillData(data.uniqueSkill.skillId);
        if (skillData) {
          levelEvent.newSkills.push(skillData);
        }
      }
    }

    events.push(levelEvent);
  }

  return events;
}

/**
 * 스킬 장착 (최대 5개)
 */
export function learnSkill(monster, skillData) {
  if (monster.skills.length < 5) {
    monster.skills.push({
      id: skillData.id,
      name: skillData.name,
      type: skillData.type,
      category: skillData.category,
      power: skillData.power,
      accuracy: skillData.accuracy,
      pp: skillData.pp,
      maxPp: skillData.pp,
      effect: skillData.effect,
      description: skillData.description,
    });
    return { replaced: false };
  }
  // 5개 꽉 참 → UI에서 교체 선택 필요
  return { replaced: false, needChoice: true, newSkill: skillData };
}

export function replaceSkill(monster, slotIndex, skillData) {
  monster.skills[slotIndex] = {
    id: skillData.id,
    name: skillData.name,
    type: skillData.type,
    category: skillData.category,
    power: skillData.power,
    accuracy: skillData.accuracy,
    pp: skillData.pp,
    maxPp: skillData.pp,
    effect: skillData.effect,
    description: skillData.description,
  };
}

/**
 * 진화 체크
 */
export function checkEvolution(monster) {
  if (!monster.evolution) return null;
  if (monster.level >= monster.evolution.level) {
    return monster.evolution.to;
  }
  return null;
}

/**
 * 진화 실행
 */
export function evolve(monster) {
  const newId = monster.evolution.to;
  const newData = getMonsterData(newId);
  if (!newData) return false;

  const oldMaxHp = monster.stats.hp;
  monster.id = newData.id;
  monster.name = monster.nickname ? monster.name : newData.name;
  monster.type = [...newData.type];
  monster.baseStats = { ...newData.baseStats };
  monster.evolution = newData.evolution ? { ...newData.evolution } : null;
  monster.catchRate = newData.catchRate;
  monster.expYield = newData.expYield;
  monster.spriteConfig = newData.spriteConfig;
  monster.description = newData.description;

  recalcStats(monster);
  // HP 비례 유지
  const hpGain = monster.stats.hp - oldMaxHp;
  monster.currentHp = Math.min(monster.currentHp + Math.max(0, hpGain), monster.stats.hp);

  return true;
}

/**
 * 경험치 필요량
 */
export function expToNextLevel(monster) {
  if (monster.level >= 100) return 0;
  return expForLevel(monster.level + 1, monster.growthRate) - monster.exp;
}

/**
 * 몬스터 직렬화 (세이브용)
 */
export function serializeMonster(monster) {
  return { ...monster };
}

/**
 * 몬스터 역직렬화 (로드용)
 */
export function deserializeMonster(data) {
  return { ...data };
}
