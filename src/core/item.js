/**
 * item.js — Item effect system for battle and field use
 */

import { isFainted } from './monster.js';

/**
 * Apply an item's effect to a target monster
 * @param {Object} item - Item data from items.json
 * @param {Object} target - Monster instance
 * @returns {{ success: boolean, message: string }}
 */
export function useItem(item, target) {
  const effect = item.effect;
  if (!effect) return { success: false, message: 'NO EFFECT' };

  switch (effect.type) {
    case 'heal_hp': {
      if (isFainted(target)) return { success: false, message: 'CANNOT USE ON FAINTED!' };
      const before = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + effect.value);
      const healed = target.hp - before;
      return { success: true, message: `${target.name} HEALED ${healed} HP!` };
    }

    case 'restore_pp': {
      if (isFainted(target)) return { success: false, message: 'CANNOT USE ON FAINTED!' };
      let restored = false;
      for (const skill of target.skills) {
        const max = skill.pp || 20;
        if (skill.ppLeft < max) {
          skill.ppLeft = Math.min(max, skill.ppLeft + effect.value);
          restored = true;
        }
      }
      return { success: restored, message: restored ? `${target.name} PP RESTORED!` : 'PP ALREADY FULL!' };
    }

    case 'cure_status': {
      if (isFainted(target)) return { success: false, message: 'CANNOT USE ON FAINTED!' };
      if (!target.status) return { success: false, message: 'NO STATUS TO CURE!' };
      if (effect.value === 'all' || effect.value === target.status) {
        const cured = target.status;
        target.status = null;
        return { success: true, message: `${target.name} CURED OF ${cured.toUpperCase()}!` };
      }
      return { success: false, message: 'WRONG STATUS TYPE!' };
    }

    case 'revive': {
      if (!isFainted(target)) return { success: false, message: 'NOT FAINTED!' };
      target.hp = Math.floor(target.maxHp * effect.value);
      target.status = null;
      return { success: true, message: `${target.name} REVIVED!` };
    }

    case 'stat_boost': {
      if (isFainted(target)) return { success: false, message: 'CANNOT USE ON FAINTED!' };
      if (!target.statStages) target.statStages = {};
      const stat = effect.stat;
      const current = target.statStages[stat] || 0;
      if (current >= 6) return { success: false, message: `${stat.toUpperCase()} CANNOT GO HIGHER!` };
      target.statStages[stat] = Math.min(6, current + effect.value);
      return { success: true, message: `${target.name} ${stat.toUpperCase()} ROSE!` };
    }

    default:
      return { success: false, message: 'CANNOT USE HERE!' };
  }
}

/**
 * Get stat multiplier from stat stage (-6 to +6)
 */
export function getStatMultiplier(stage) {
  const s = Math.max(-6, Math.min(6, stage || 0));
  if (s >= 0) return (2 + s) / 2;
  return 2 / (2 - s);
}
