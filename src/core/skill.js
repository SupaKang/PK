// 스킬 효과 처리 시스템
import { getEffectiveness, getEffectivenessText } from './type.js';

/**
 * 데미지 계산 (포켓몬 공식 기반)
 */
export function calcDamage(attacker, defender, skill, isCritical = false) {
  if (skill.category === 'status') return 0;

  const level = attacker.level;
  const power = skill.power;

  // 물리/특수 분기
  const atk = skill.category === 'physical' ? attacker.stats.atk : attacker.stats.spAtk;
  const def = skill.category === 'physical' ? defender.stats.def : defender.stats.spDef;

  // 기본 데미지 공식
  let damage = Math.floor(((2 * level / 5 + 2) * power * atk / def) / 50) + 2;

  // 크리티컬 (1.5배)
  if (isCritical) {
    damage = Math.floor(damage * 1.5);
  }

  // 자속 보정 (STAB: Same Type Attack Bonus)
  if (attacker.type.includes(skill.type)) {
    damage = Math.floor(damage * 1.5);
  }

  // 타입 상성
  const effectiveness = getEffectiveness(skill.type, defender.type);
  damage = Math.floor(damage * effectiveness);

  // 화상 상태: 물리 공격력 50% 감소
  if (attacker.status === 'burn' && skill.category === 'physical') {
    damage = Math.floor(damage * 0.5);
  }

  // 랜덤 보정 (85~100%)
  const random = (Math.floor(Math.random() * 16) + 85) / 100;
  damage = Math.max(1, Math.floor(damage * random));

  // 무효 타입은 0
  if (effectiveness === 0) damage = 0;

  return damage;
}

/**
 * 명중 판정
 */
export function checkAccuracy(attacker, defender, skill) {
  // 마비 상태: 25% 확률로 행동 불가 (별도 처리)
  const accuracy = skill.accuracy;
  const roll = Math.random() * 100;
  return roll < accuracy;
}

/**
 * 크리티컬 판정 (1/16 확률)
 */
export function checkCritical() {
  return Math.random() < 1 / 16;
}

/**
 * 스킬 효과 적용
 * @returns {Array} 효과 메시지 배열
 */
export function applySkillEffect(skill, attacker, defender, damage) {
  const messages = [];
  if (!skill.effect) return messages;

  const eff = skill.effect;
  const chance = eff.chance || 100;
  if (Math.random() * 100 >= chance) return messages;

  const target = eff.target === 'self' ? attacker : defender;

  switch (eff.type) {
    case 'burn':
      if (!target.status) {
        target.status = 'burn';
        messages.push(`${target.name}은(는) 화상을 입었다!`);
      }
      break;
    case 'poison':
      if (!target.status) {
        target.status = 'poison';
        messages.push(`${target.name}은(는) 독에 걸렸다!`);
      }
      break;
    case 'paralyze':
      if (!target.status) {
        target.status = 'paralyze';
        messages.push(`${target.name}은(는) 마비되었다!`);
      }
      break;
    case 'sleep':
      if (!target.status) {
        target.status = 'sleep';
        target.statusTurns = Math.floor(Math.random() * 3) + 1;
        messages.push(`${target.name}은(는) 잠들었다!`);
      }
      break;
    case 'confuse':
      if (!target.status) {
        target.status = 'confuse';
        target.statusTurns = Math.floor(Math.random() * 4) + 1;
        messages.push(`${target.name}은(는) 혼란에 빠졌다!`);
      }
      break;
    case 'freeze':
      if (!target.status) {
        target.status = 'freeze';
        messages.push(`${target.name}은(는) 얼어붙었다!`);
      }
      break;
    case 'stat_up':
    case 'stat_down': {
      const stat = eff.stat;
      const amount = eff.amount || (eff.type === 'stat_up' ? 1 : -1);
      // 스탯 변화 단계 적용 (간소화: 직접 스탯 비율 조정)
      if (!target._statStages) {
        target._statStages = { atk: 0, def: 0, spAtk: 0, spDef: 0, speed: 0 };
      }
      const oldStage = target._statStages[stat] || 0;
      const newStage = Math.max(-6, Math.min(6, oldStage + amount));
      target._statStages[stat] = newStage;
      const statNames = { atk: '공격', def: '방어', spAtk: '특수공격', spDef: '특수방어', speed: '스피드' };
      if (amount > 0) {
        messages.push(`${target.name}의 ${statNames[stat]}이(가) 올랐다!`);
      } else {
        messages.push(`${target.name}의 ${statNames[stat]}이(가) 떨어졌다!`);
      }
      break;
    }
    case 'heal': {
      const healAmount = Math.floor(attacker.stats.hp * (eff.value || 0.5));
      attacker.currentHp = Math.min(attacker.stats.hp, attacker.currentHp + healAmount);
      messages.push(`${attacker.name}은(는) 체력을 회복했다!`);
      break;
    }
    case 'recoil': {
      const recoilDmg = Math.max(1, Math.floor(damage * (eff.value || 0.25)));
      attacker.currentHp = Math.max(0, attacker.currentHp - recoilDmg);
      messages.push(`${attacker.name}은(는) 반동 데미지를 받았다!`);
      break;
    }
    case 'drain': {
      const drainAmount = Math.max(1, Math.floor(damage * (eff.value || 0.5)));
      attacker.currentHp = Math.min(attacker.stats.hp, attacker.currentHp + drainAmount);
      messages.push(`${attacker.name}은(는) 체력을 흡수했다!`);
      break;
    }
    case 'flinch':
      defender._flinched = true;
      break;
  }

  return messages;
}

/**
 * 스탯 단계 배율
 */
export function getStatMultiplier(stage) {
  if (stage >= 0) return (2 + stage) / 2;
  return 2 / (2 - stage);
}

/**
 * 실제 전투 스탯 (단계 적용)
 */
export function getEffectiveStat(monster, statName) {
  const base = monster.stats[statName];
  const stage = monster._statStages?.[statName] || 0;
  return Math.floor(base * getStatMultiplier(stage));
}

/**
 * 턴 종료 시 상태이상 데미지
 */
export function processStatusDamage(monster) {
  const messages = [];
  switch (monster.status) {
    case 'burn': {
      const dmg = Math.max(1, Math.floor(monster.stats.hp / 16));
      monster.currentHp = Math.max(0, monster.currentHp - dmg);
      messages.push(`${monster.name}은(는) 화상 데미지를 받았다!`);
      break;
    }
    case 'poison': {
      const dmg = Math.max(1, Math.floor(monster.stats.hp / 8));
      monster.currentHp = Math.max(0, monster.currentHp - dmg);
      messages.push(`${monster.name}은(는) 독 데미지를 받았다!`);
      break;
    }
  }
  return messages;
}

/**
 * 상태이상으로 인한 행동 가능 체크
 * @returns {{ canAct: boolean, messages: string[] }}
 */
export function checkStatusAction(monster) {
  const messages = [];
  switch (monster.status) {
    case 'sleep':
      if (monster.statusTurns > 0) {
        monster.statusTurns--;
        messages.push(`${monster.name}은(는) 깊이 잠들어 있다...`);
        return { canAct: false, messages };
      }
      monster.status = null;
      messages.push(`${monster.name}은(는) 눈을 떴다!`);
      return { canAct: true, messages };
    case 'paralyze':
      if (Math.random() < 0.25) {
        messages.push(`${monster.name}은(는) 마비되어 움직일 수 없다!`);
        return { canAct: false, messages };
      }
      return { canAct: true, messages };
    case 'freeze':
      if (Math.random() < 0.2) {
        monster.status = null;
        messages.push(`${monster.name}은(는) 얼음이 풀렸다!`);
        return { canAct: true, messages };
      }
      messages.push(`${monster.name}은(는) 얼어서 움직일 수 없다!`);
      return { canAct: false, messages };
    case 'confuse':
      if (monster.statusTurns > 0) {
        monster.statusTurns--;
        if (Math.random() < 0.33) {
          // 자해 데미지
          const dmg = Math.max(1, Math.floor(monster.stats.hp / 8));
          monster.currentHp = Math.max(0, monster.currentHp - dmg);
          messages.push(`${monster.name}은(는) 혼란 속에 자신을 공격했다!`);
          return { canAct: false, messages };
        }
        return { canAct: true, messages };
      }
      monster.status = null;
      messages.push(`${monster.name}은(는) 정신을 차렸다!`);
      return { canAct: true, messages };
    default:
      return { canAct: true, messages };
  }
}

/** 발버둥 (PP 고갈 시 사용) */
export const STRUGGLE_SKILL = {
  id: 'struggle',
  name: '발버둥',
  type: 'normal',
  category: 'physical',
  power: 50,
  accuracy: 100,
  pp: Infinity,
  maxPp: Infinity,
  effect: { type: 'recoil', value: 0.25 },
  description: 'PP가 모두 떨어졌을 때 사용하는 최후의 발악.',
};
