// 플레이어 직업(클래스) 시스템
// 계약자(주인)는 몬스터와 유사한 스탯/스킬 체계를 가진다.

import { getSkillData } from './monster.js';

let classesDB = null;

export async function loadClasses() {
  const res = await fetch('./data/classes.json');
  const data = await res.json();
  classesDB = data.classes || [];
  return classesDB;
}

export function getClassData(classId) {
  return classesDB?.find(c => c.id === classId) || null;
}

export function getAllClasses() {
  return classesDB || [];
}

/** 경험치 테이블 */
function expForLevel(level, growthRate) {
  const base = level * level * level;
  switch (growthRate) {
    case 'fast': return Math.floor(base * 0.8);
    case 'medium': return base;
    case 'slow': return Math.floor(base * 1.25);
    default: return base;
  }
}

/** HP 스탯 계산 */
function calcHpStat(base, level) {
  return Math.floor((2 * base * level) / 100) + level + 10;
}

/** 일반 스탯 계산 */
function calcStat(base, level) {
  return Math.floor((2 * base * level) / 100) + 5;
}

/**
 * 계약자(플레이어 캐릭터) 생성
 * 몬스터와 동일한 인터페이스를 가지되 isContractor=true로 구분
 */
export function createContractor(classId, level = 5, name = '주인공') {
  const data = getClassData(classId);
  if (!data) throw new Error(`Class ID ${classId} not found`);

  const contractor = {
    uid: crypto.randomUUID(),
    id: `contractor_${classId}`,
    name: name,
    nickname: null,
    type: [...data.type],
    level,
    exp: expForLevel(level, data.growthRate),
    growthRate: data.growthRate,
    isContractor: true,
    classId: classId,
    className: data.name,

    // 계약자는 IV/EV 대신 고정 성장
    iv: { hp: 15, atk: 15, def: 15, spAtk: 15, spDef: 15, speed: 15 },
    ev: { hp: 0, atk: 0, def: 0, spAtk: 0, spDef: 0, speed: 0 },

    stats: {},
    currentHp: 0,
    status: null,
    statusTurns: 0,

    skills: [],
    baseStats: { ...data.baseStats },
    evolution: null, // 계약자는 진화 없음
    catchRate: 0,    // 계약 불가
    expYield: 0,
    spriteConfig: data.spriteConfig,
    description: data.description,
  };

  // 스탯 계산
  recalcContractorStats(contractor);
  contractor.currentHp = contractor.stats.hp;

  // 레벨에 맞는 스킬 습득
  learnSkillsForLevel(contractor, data);

  return contractor;
}

export function recalcContractorStats(contractor) {
  const lv = contractor.level;
  const bs = contractor.baseStats;

  contractor.stats = {
    hp: calcHpStat(bs.hp, lv),
    atk: calcStat(bs.atk, lv),
    def: calcStat(bs.def, lv),
    spAtk: calcStat(bs.spAtk, lv),
    spDef: calcStat(bs.spDef, lv),
    speed: calcStat(bs.speed, lv),
  };
}

function learnSkillsForLevel(contractor, data) {
  const learned = [];

  for (const entry of data.learnset) {
    if (entry.level <= contractor.level) {
      learned.push(entry.skillId);
    }
  }

  const lastFive = learned.slice(-5);
  contractor.skills = lastFive.map(skillId => {
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
 * 계약자 경험치 획득 및 레벨업
 * @returns {Array} 레벨업 이벤트 목록
 */
export function gainContractorExp(contractor, amount) {
  const events = [];
  contractor.exp += amount;

  while (true) {
    const nextLevelExp = expForLevel(contractor.level + 1, contractor.growthRate);
    if (contractor.exp < nextLevelExp || contractor.level >= 100) break;

    contractor.level++;
    const oldHp = contractor.stats.hp;
    recalcContractorStats(contractor);
    const hpGain = contractor.stats.hp - oldHp;
    contractor.currentHp += hpGain;

    const levelEvent = { type: 'level_up', level: contractor.level, newSkills: [] };

    const data = getClassData(contractor.classId);
    if (data) {
      for (const entry of data.learnset) {
        if (entry.level === contractor.level) {
          const skillData = getSkillData(entry.skillId);
          if (skillData) {
            levelEvent.newSkills.push(skillData);
          }
        }
      }
    }

    events.push(levelEvent);
  }

  return events;
}
