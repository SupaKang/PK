// 스킬 효과 처리 시스템
import { getEffectiveness, getEffectivenessText } from './type.js';
import { applyDamageBuff, applyAccuracyBuff, applyCritBuff, applyDrainBuff, applyHealBuff, applyStatBuff, checkStatusResist } from './party-buffs.js';
import { getMonsterAbility } from './abilities.js';

/**
 * 데미지 계산 (포켓몬 공식 기반)
 */
export function calcDamage(attacker, defender, skill, isCritical = false, partyBuffs = null) {
  if (skill.category === 'status') return 0;

  const level = attacker.level;
  let power = skill.power;

  // HP% 기반 위력 (잔량 비례)
  if (skill.effect?.type === 'power_by_hp') {
    power = Math.max(1, Math.floor(power * (attacker.currentHp / attacker.stats.hp)));
  }

  // 역전 기술 (HP 적을수록 위력 증가)
  if (skill.effect?.type === 'reversal') {
    const ratio = attacker.currentHp / attacker.stats.hp;
    if (ratio < 0.05) power = 200;
    else if (ratio < 0.1) power = 150;
    else if (ratio < 0.2) power = 100;
    else if (ratio < 0.35) power = 80;
    else if (ratio < 0.7) power = 40;
    else power = 20;
  }

  // 물리/특수 분기
  const atkStat = skill.category === 'physical' ? 'atk' : 'spAtk';
  const defStat = skill.category === 'physical' ? 'def' : 'spDef';
  const atk = getEffectiveStat(attacker, atkStat);
  const def = getEffectiveStat(defender, defStat);

  // 기본 데미지 공식
  let damage = Math.floor(((2 * level / 5 + 2) * power * atk / def) / 50) + 2;

  // 크리티컬 (1.5배, 스탯 변화 무시)
  if (isCritical) {
    damage = Math.floor(damage * 1.5);
  }

  // 자속 보정 (STAB) — 적응력 특성 시 2.0x
  if (attacker.type.includes(skill.type)) {
    const ability = getMonsterAbility(attacker);
    const stabMultiplier = (ability && ability.effect === 'adaptability') ? 2.0 : 1.5;
    damage = Math.floor(damage * stabMultiplier);
  }

  // 유대도 보너스 (bond damage bonus)
  const bond = attacker.bond || 0;
  if (bond >= 200) damage = Math.floor(damage * 1.1);      // +10% at max bond
  else if (bond >= 100) damage = Math.floor(damage * 1.05); // +5% at high bond

  // 타입 상성
  const effectiveness = getEffectiveness(skill.type, defender.type);
  damage = Math.floor(damage * effectiveness);

  // 근성(guts) 특성: 상태이상 시 물리 공격력 +50%, 화상 감소 무효
  const attackerAbility = getMonsterAbility(attacker);
  const hasGuts = attackerAbility && attackerAbility.effect === 'guts';

  if (attacker.status && hasGuts && skill.category === 'physical') {
    damage = Math.floor(damage * 1.5);
  } else if (attacker.status === 'burn' && skill.category === 'physical') {
    // 화상 상태: 물리 공격력 50% 감소
    damage = Math.floor(damage * 0.5);
  }

  // 랜덤 보정 (85~100%)
  const random = (Math.floor(Math.random() * 16) + 85) / 100;
  damage = Math.max(1, Math.floor(damage * random));

  // 무효 타입은 0
  if (effectiveness === 0) damage = 0;

  // 파티 버프 적용
  damage = applyDamageBuff(damage, skill.category, partyBuffs);

  return damage;
}

/**
 * 명중 판정
 */
export function checkAccuracy(attacker, defender, skill, partyBuffs = null) {
  if (skill.accuracy === true || skill.accuracy >= 999) return true; // 필중기
  let accuracy = skill.accuracy;
  accuracy = applyAccuracyBuff(accuracy, skill.category, partyBuffs);
  const roll = Math.random() * 100;
  return roll < accuracy;
}

/**
 * 크리티컬 판정
 */
export function checkCritical(skill, partyBuffs = null, attackerBond = 0) {
  const highCrit = skill?.effect?.type === 'high_crit';
  let rate = applyCritBuff(highCrit ? 25 : 6.25, partyBuffs) / 100;
  // 유대도 크리티컬 보너스
  if (attackerBond >= 150) rate += 0.03; // +3% crit
  return Math.random() < rate;
}

/**
 * 스킬 우선도 (priority) 가져오기
 * 양수 = 선공, 0 = 보통, 음수 = 후공
 */
export function getSkillPriority(skill) {
  if (!skill) return 0;
  if (skill.priority !== undefined) return skill.priority;
  return 0;
}

/**
 * 멀티히트 횟수 계산
 */
export function getMultiHitCount(skill) {
  if (!skill.effect || skill.effect.type !== 'multi_hit') return 1;
  const hits = skill.effect.hits;
  if (typeof hits === 'number') return hits;
  // 2-5회 랜덤 (가중: 2,3회가 더 잘 나옴)
  const roll = Math.random();
  if (roll < 0.35) return 2;
  if (roll < 0.70) return 3;
  if (roll < 0.85) return 4;
  return 5;
}

/**
 * 스킬 효과 적용
 * @returns {Array} 효과 메시지 배열
 */
export function applySkillEffect(skill, attacker, defender, damage, attackerBuffs = null, defenderBuffs = null) {
  const messages = [];
  if (!skill.effect) return messages;

  const eff = skill.effect;

  // 효과 발동 확률 체크 (multi_hit, recoil, drain, protect 등은 무조건 발동)
  const alwaysProc = ['recoil', 'drain', 'multi_hit', 'protect', 'high_crit', 'power_by_hp', 'reversal', 'self_cure', 'fixed_damage'];
  if (!alwaysProc.includes(eff.type)) {
    const chance = eff.chance || 100;
    if (Math.random() * 100 >= chance) return messages;
  }

  const target = eff.target === 'self' ? attacker : defender;

  switch (eff.type) {
    case 'burn':
      if (checkStatusResist(defenderBuffs)) break;
      if (!target.status) {
        target.status = 'burn';
        messages.push(`${target.name}은(는) 화상을 입었다!`);
      }
      break;
    case 'poison':
      if (checkStatusResist(defenderBuffs)) break;
      if (!target.status) {
        target.status = 'poison';
        messages.push(`${target.name}은(는) 독에 걸렸다!`);
      }
      break;
    case 'paralyze':
      if (checkStatusResist(defenderBuffs)) break;
      if (!target.status) {
        target.status = 'paralyze';
        messages.push(`${target.name}은(는) 마비되었다!`);
      }
      break;
    case 'sleep':
      if (checkStatusResist(defenderBuffs)) break;
      if (!target.status) {
        target.status = 'sleep';
        target.statusTurns = Math.floor(Math.random() * 3) + 1;
        messages.push(`${target.name}은(는) 잠들었다!`);
      }
      break;
    case 'confuse':
      if (checkStatusResist(defenderBuffs)) break;
      if (!target.status) {
        target.status = 'confuse';
        target.statusTurns = Math.floor(Math.random() * 4) + 1;
        messages.push(`${target.name}은(는) 혼란에 빠졌다!`);
      }
      break;
    case 'freeze':
      if (checkStatusResist(defenderBuffs)) break;
      if (!target.status) {
        target.status = 'freeze';
        messages.push(`${target.name}은(는) 얼어붙었다!`);
      }
      break;

    case 'stat_up':
    case 'stat_down': {
      const stat = eff.stat;
      const amount = eff.amount || (eff.type === 'stat_up' ? 1 : -1);
      if (!target._statStages) {
        target._statStages = { atk: 0, def: 0, spAtk: 0, spDef: 0, speed: 0 };
      }
      const oldStage = target._statStages[stat] || 0;
      const newStage = Math.max(-6, Math.min(6, oldStage + amount));
      target._statStages[stat] = newStage;
      const statNames = { atk: '공격', def: '방어', spAtk: '특수공격', spDef: '특수방어', speed: '스피드' };
      const diff = newStage - oldStage;
      if (diff > 0) {
        messages.push(`${target.name}의 ${statNames[stat]}이(가) ${diff > 1 ? '크게 ' : ''}올랐다!`);
      } else if (diff < 0) {
        messages.push(`${target.name}의 ${statNames[stat]}이(가) ${diff < -1 ? '크게 ' : ''}떨어졌다!`);
      } else {
        messages.push(`${target.name}의 ${statNames[stat]}은(는) 더 이상 변하지 않는다!`);
      }
      break;
    }

    case 'heal': {
      let healAmount = Math.floor(attacker.stats.hp * (eff.value || 0.5));
      healAmount = applyHealBuff(healAmount, attackerBuffs);
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
      let drainAmount = Math.max(1, Math.floor(damage * (eff.value || 0.5)));
      drainAmount = applyDrainBuff(drainAmount, attackerBuffs);
      attacker.currentHp = Math.min(attacker.stats.hp, attacker.currentHp + drainAmount);
      messages.push(`${attacker.name}은(는) 체력을 흡수했다!`);
      break;
    }

    case 'flinch':
      defender._flinched = true;
      break;

    // ─── 새 효과 ───

    case 'self_cure':
      if (attacker.status) {
        const oldStatus = attacker.status;
        attacker.status = null;
        attacker.statusTurns = 0;
        messages.push(`${attacker.name}의 상태이상이 회복되었다!`);
      }
      break;

    case 'fixed_damage':
      // 데미지 계산과 별개로 고정 데미지 (calcDamage와 별도 처리)
      // 실제 데미지는 battle.js에서 처리
      break;

    case 'multi_hit':
      // 멀티히트 처리는 battle.js에서 반복 실행
      break;

    case 'protect':
      // 방어 상태는 battle.js에서 처리
      attacker._protected = true;
      messages.push(`${attacker.name}은(는) 방어 태세를 취했다!`);
      break;

    case 'high_crit':
      // 높은 크리티컬 (checkCritical에서 처리)
      break;

    case 'power_by_hp':
    case 'reversal':
      // 위력 계산은 calcDamage에서 처리
      break;

    case 'leech':
      // 지속 흡수 (매 턴 HP 흡수)
      if (!defender._leech) {
        defender._leech = attacker;
        messages.push(`${defender.name}에게 씨앗을 심었다!`);
      }
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
export function getEffectiveStat(monster, statName, partyBuffs = null) {
  const base = monster.stats[statName];
  const stage = monster._statStages?.[statName] || 0;
  let result = Math.floor(base * getStatMultiplier(stage));
  // 파티 버프 (궁수 속도, 마법사 특방 등)
  result = applyStatBuff(result, statName, partyBuffs);
  return result;
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

  // 씨뿌리기(leech) 데미지
  if (monster._leech && monster._leech.currentHp > 0) {
    const dmg = Math.max(1, Math.floor(monster.stats.hp / 8));
    monster.currentHp = Math.max(0, monster.currentHp - dmg);
    monster._leech.currentHp = Math.min(monster._leech.stats.hp, monster._leech.currentHp + dmg);
    messages.push(`${monster.name}의 체력이 흡수되었다!`);
  }

  return messages;
}

/**
 * 상태이상으로 인한 행동 가능 체크
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
  priority: 0,
  effect: { type: 'recoil', value: 0.25 },
  description: 'PP가 모두 떨어졌을 때 사용하는 최후의 발악.',
};
