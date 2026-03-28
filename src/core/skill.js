/**
 * skill.js — Damage calculation, accuracy, critical hits, status effects
 * Implements the battle damage formula with type matchups
 */

import { getStatMultiplier } from './item.js';

/**
 * Calculate damage from attacker using skill against defender
 * @param {Object} attacker - Monster instance
 * @param {Object} defender - Monster instance
 * @param {Object} skill - Skill data with type, category, power
 * @param {import('./type.js').TypeChart} typeChart
 * @returns {Object} { damage, effectiveness, critical, missed }
 */
export function calcDamage(attacker, defender, skill, typeChart) {
  // Accuracy check
  const accuracyRoll = Math.random() * 100;
  if (accuracyRoll >= (skill.accuracy || 100)) {
    return { damage: 0, effectiveness: 1, critical: false, missed: true };
  }

  // Status moves don't deal damage
  if (skill.category === 'status' || !skill.power) {
    return { damage: 0, effectiveness: 1, critical: false, missed: false };
  }

  // Get attack/defense stats based on category, with stat stage modifiers
  let atk, def;
  const aStages = attacker.statStages || {};
  const dStages = defender.statStages || {};
  if (skill.category === 'special') {
    atk = Math.floor(attacker.stats.spAtk * getStatMultiplier(aStages.spAtk));
    def = Math.floor(defender.stats.spDef * getStatMultiplier(dStages.spDef));
  } else {
    atk = Math.floor(attacker.stats.atk * getStatMultiplier(aStages.atk));
    def = Math.floor(defender.stats.def * getStatMultiplier(dStages.def));
  }

  // Base damage formula
  const level = attacker.level;
  let damage = Math.floor(((2 * level / 5 + 2) * skill.power * atk / def) / 50) + 2;

  // STAB (Same Type Attack Bonus)
  const attackerTypes = attacker.type || [];
  if (attackerTypes.includes(skill.type)) {
    damage = Math.floor(damage * 1.5);
  }

  // Type effectiveness
  const defenderTypes = defender.type || ['normal'];
  const effectiveness = typeChart.getMultiplier(skill.type, defenderTypes);
  damage = Math.floor(damage * effectiveness);

  // Critical hit (6.25% chance, 1.5x damage)
  let critical = false;
  if (Math.random() < 0.0625) {
    critical = true;
    damage = Math.floor(damage * 1.5);
  }

  // Random variance (85-100%)
  const rand = 0.85 + Math.random() * 0.15;
  damage = Math.max(1, Math.floor(damage * rand));

  // Apply skill secondary effect (status)
  let statusApplied = null;
  if (skill.effect && skill.effect.type && damage > 0) {
    const chance = skill.effect.chance || 100;
    if (Math.random() * 100 < chance) {
      statusApplied = applySkillEffect(skill.effect, attacker, defender);
    }
  }

  return { damage, effectiveness, critical, missed: false, statusApplied };
}

/**
 * Apply a skill's secondary effect
 */
function applySkillEffect(effect, attacker, defender) {
  const target = effect.target === 'self' ? attacker : defender;

  switch (effect.type) {
    case 'burn':
    case 'poison':
    case 'paralyze':
    case 'sleep':
    case 'confusion':
    case 'freeze':
      if (!target.status) {
        target.status = effect.type;
        return effect.type;
      }
      return null;

    case 'flinch':
      target._flinched = true;
      return 'flinch';

    case 'stat_change': {
      if (!target.statStages) target.statStages = {};
      const stat = effect.stat;
      const current = target.statStages[stat] || 0;
      const newVal = Math.max(-6, Math.min(6, current + (effect.value || 0)));
      target.statStages[stat] = newVal;
      return newVal > current ? `${stat}_up` : `${stat}_down`;
    }

    default:
      return null;
  }
}

/**
 * Apply status damage at end of turn (burn, poison)
 * @returns {{ damage: number, message: string }|null}
 */
export function applyStatusDamage(monster) {
  if (!monster.status) return null;

  switch (monster.status) {
    case 'burn': {
      const dmg = Math.max(1, Math.floor(monster.maxHp / 16));
      monster.hp = Math.max(0, monster.hp - dmg);
      return { damage: dmg, message: `${monster.name} IS HURT BY BURN!` };
    }
    case 'poison': {
      const dmg = Math.max(1, Math.floor(monster.maxHp / 8));
      monster.hp = Math.max(0, monster.hp - dmg);
      return { damage: dmg, message: `${monster.name} IS HURT BY POISON!` };
    }
    default:
      return null;
  }
}

/**
 * Check if monster can act this turn (paralyze, sleep, confusion, freeze)
 * @returns {{ canAct: boolean, message: string }}
 */
export function checkStatusAction(monster) {
  if (!monster.status) return { canAct: true, message: '' };

  switch (monster.status) {
    case 'paralyze':
      if (Math.random() < 0.25) {
        return { canAct: false, message: `${monster.name} IS PARALYZED!` };
      }
      return { canAct: true, message: '' };

    case 'sleep':
      // 33% chance to wake up each turn
      if (Math.random() < 0.33) {
        monster.status = null;
        return { canAct: true, message: `${monster.name} WOKE UP!` };
      }
      return { canAct: false, message: `${monster.name} IS ASLEEP...` };

    case 'freeze':
      // 20% chance to thaw each turn
      if (Math.random() < 0.2) {
        monster.status = null;
        return { canAct: true, message: `${monster.name} THAWED OUT!` };
      }
      return { canAct: false, message: `${monster.name} IS FROZEN!` };

    case 'confusion':
      if (Math.random() < 0.33) {
        // Hit self
        const selfDmg = Math.max(1, Math.floor(monster.stats.atk / 4));
        monster.hp = Math.max(0, monster.hp - selfDmg);
        return { canAct: false, message: `${monster.name} HURT ITSELF IN CONFUSION!` };
      }
      return { canAct: true, message: '' };

    default:
      return { canAct: true, message: '' };
  }
}
