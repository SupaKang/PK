/**
 * camping.js — Camping & Resource Management System for Pocket Kingdom
 *
 * In the wilds of Pocket Kingdom there are no healing centers.
 * The only way to recover is to make camp, which costs precious AP.
 * Every rest is a tactical decision: heal now, or push forward?
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CAMP_TYPES = {
  quick: { id: 'quick', name: '간이 휴식', apCost: 4, hpPercent: 0.25, ppPercent: 0, cureStatus: false },
  basic: { id: 'basic', name: '야영', apCost: 8, hpPercent: 0.50, ppPercent: 0.50, cureStatus: false },
  full:  { id: 'full',  name: '완전 야영', apCost: 16, hpPercent: 1.0, ppPercent: 1.0, cureStatus: true },
};

export const CAMP_EVENTS = [
  {
    id: 'merchant', weight: 3, name: '떠돌이 상인',
    description: '밤중에 떠돌이 상인이 찾아왔다.', type: 'shop',
  },
  {
    id: 'night_monster', weight: 2, name: '야습',
    description: '잠든 사이 마물이 습격했다!', type: 'battle',
    monsterIds: [31, 64, 83], levelBonus: 3,
  },
  {
    id: 'starlight', weight: 2, name: '별빛의 축복',
    description: '별빛이 파티를 감싸 모두 완전 회복되었다.', type: 'heal_full',
  },
  {
    id: 'lost_item', weight: 3, name: '발견',
    description: '캠프 주변에서 아이템을 발견했다.', type: 'item',
    possibleItems: ['potion', 'super_potion', 'magic_stone', 'pp_restore'],
  },
  {
    id: 'fairy_tea', weight: 1, name: '요정의 다과회',
    description: '작은 요정들이 나타나 차를 대접해 주었다. AP가 소량 회복된다.',
    type: 'ap_restore', apAmount: 10,
  },
  {
    id: 'nightmare', weight: 2, name: '악몽',
    description: '마기가 짙은 곳에서 악몽을 꾸었다. 계약자에게 혼란이 걸렸다.',
    type: 'debuff',
  },
  {
    id: 'campfire_story', weight: 2, name: '모닥불 이야기',
    description: '고랭이와 함께 모닥불을 바라보며 쉬었다. 유대가 깊어졌다.',
    type: 'bond', expBonus: 50,
  },
];

export const FOOD_ITEMS = {
  'ration': {
    name: '전투 식량',
    healBonus: 0.2,
    description: '캠핑 시 추가 20% 회복',
  },
  'herb_tea': {
    name: '약초차',
    ppBonus: 0.3,
    description: '캠핑 시 PP 추가 30% 회복',
  },
  'energy_bar': {
    name: '에너지바',
    apSave: 2,
    description: '캠핑 소모 AP 2 감소',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CAMP_EVENT_CHANCE = 0.15;

/** Weighted random selection from the CAMP_EVENTS table. */
function weightedRandomEvent() {
  const totalWeight = CAMP_EVENTS.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const event of CAMP_EVENTS) {
    roll -= event.weight;
    if (roll <= 0) {
      return { ...event };
    }
  }

  // Fallback (should not happen)
  return { ...CAMP_EVENTS[0] };
}

/**
 * Clamp a number between min and max (inclusive).
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// ---------------------------------------------------------------------------
// CampingManager
// ---------------------------------------------------------------------------

export class CampingManager {
  constructor() {
    /** History of camps made during this session. */
    this.campLog = [];
  }

  // -----------------------------------------------------------------------
  // Camping eligibility
  // -----------------------------------------------------------------------

  /**
   * Check whether the player can camp right now.
   *
   * @param {object} expeditionManager - An object expected to expose at least
   *   `currentAP` (number) and optionally `inCombat` (boolean) /
   *   `inSafeZone` (boolean).
   * @returns {{ canCamp: boolean, reason: string|null }}
   */
  canCamp(expeditionManager) {
    if (!expeditionManager) {
      return { canCamp: false, reason: 'expedition 데이터가 없습니다.' };
    }

    if (expeditionManager.inCombat) {
      return { canCamp: false, reason: '전투 중에는 야영할 수 없습니다.' };
    }

    const minCost = CAMP_TYPES.quick.apCost; // cheapest option
    if (typeof expeditionManager.currentAP === 'number' && expeditionManager.currentAP < minCost) {
      return { canCamp: false, reason: `AP가 부족합니다. (최소 ${minCost} AP 필요)` };
    }

    return { canCamp: true, reason: null };
  }

  // -----------------------------------------------------------------------
  // Execute camp
  // -----------------------------------------------------------------------

  /**
   * Heal the party by camping.
   *
   * @param {object[]} party - Array of party member objects. Each member is
   *   expected to have at least:
   *     { hp, maxHp, pp?, maxPp?, status? }
   *   The member objects are mutated in place.
   * @param {number} apCost - AP the player chose to spend (4, 8, or 16).
   * @param {object} [options]
   * @param {string} [options.foodItemId] - Key into FOOD_ITEMS, if the
   *   player is consuming a food item during this camp.
   * @returns {{
   *   campType: object,
   *   actualApCost: number,
   *   healed: object[],
   *   foodUsed: object|null,
   *   event: object|null
   * }}
   */
  executeCamp(party, apCost, options = {}) {
    // Resolve camp type from AP cost
    const campType = this._resolveCampType(apCost);

    // Determine food bonuses
    let foodUsed = null;
    let healBonusPercent = 0;
    let ppBonusPercent = 0;
    let apSaved = 0;

    if (options.foodItemId && FOOD_ITEMS[options.foodItemId]) {
      const food = FOOD_ITEMS[options.foodItemId];
      foodUsed = { id: options.foodItemId, ...food };
      healBonusPercent = food.healBonus || 0;
      ppBonusPercent = food.ppBonus || 0;
      apSaved = food.apSave || 0;
    }

    const actualApCost = Math.max(1, campType.apCost - apSaved);

    // Heal each party member (PK uses currentHp/stats.hp and skill.pp/skill.maxPp)
    const healed = party.map((member) => {
      const maxHp = member.stats?.hp ?? 1;
      const before = { hp: member.currentHp ?? 0 };

      // HP recovery
      const hpRecoverPercent = campType.hpPercent + healBonusPercent;
      const hpGain = Math.floor(maxHp * hpRecoverPercent);
      member.currentHp = clamp((member.currentHp ?? 0) + hpGain, 0, maxHp);

      // PP recovery (per skill)
      const ppRecoverPercent = campType.ppPercent + ppBonusPercent;
      if (member.skills && Array.isArray(member.skills)) {
        for (const skill of member.skills) {
          if (skill.maxPp) {
            const ppGain = Math.floor(skill.maxPp * ppRecoverPercent);
            skill.pp = clamp((skill.pp ?? 0) + ppGain, 0, skill.maxPp);
          }
        }
      }

      // Status cure (full camp only)
      if (campType.cureStatus && member.status) {
        member.status = null;
        member.statusTurns = 0;
      }

      return {
        name: member.name ?? '???',
        hpBefore: before.hp,
        hpAfter: member.hp,
        ppBefore: before.pp,
        ppAfter: member.pp ?? 0,
        statusCured: campType.cureStatus,
      };
    });

    // Roll for a random camp event
    const event = this.rollCampEvent();

    // Apply automatic event side-effects where possible
    if (event) {
      this._applyCampEvent(event, party);
    }

    // Record in log
    const record = {
      timestamp: Date.now(),
      campType,
      actualApCost,
      healed,
      foodUsed,
      event,
    };
    this.campLog.push(record);

    return record;
  }

  // -----------------------------------------------------------------------
  // Camp events
  // -----------------------------------------------------------------------

  /**
   * Roll for a random camp event. 15% chance of something happening.
   *
   * @returns {object|null} An event descriptor or null if nothing happens.
   */
  rollCampEvent() {
    if (Math.random() > CAMP_EVENT_CHANCE) {
      return null;
    }
    return weightedRandomEvent();
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  /**
   * Resolve the camp type from an AP cost value.
   * Falls back to the closest valid type if the cost doesn't match exactly.
   * @private
   */
  _resolveCampType(apCost) {
    if (apCost >= CAMP_TYPES.full.apCost) return { ...CAMP_TYPES.full };
    if (apCost >= CAMP_TYPES.basic.apCost) return { ...CAMP_TYPES.basic };
    return { ...CAMP_TYPES.quick };
  }

  /**
   * Apply side-effects of certain camp events directly to the party.
   * Events like 'shop', 'battle', and 'item' are intentionally left for the
   * caller to handle via the returned event object, since they require UI
   * interaction.
   * @private
   */
  _applyCampEvent(event, party) {
    switch (event.type) {
      case 'heal_full':
        // Starlight blessing — fully heal everyone
        for (const member of party) {
          member.currentHp = member.stats?.hp ?? member.currentHp;
          if (member.skills) {
            for (const skill of member.skills) {
              if (skill.maxPp) skill.pp = skill.maxPp;
            }
          }
          member.status = null;
          member.statusTurns = 0;
        }
        break;

      case 'debuff':
        // Nightmare — inflict confusion on the contractor
        if (party.length > 0) {
          const contractor = party[0];
          if (!contractor.status) {
            contractor.status = 'confuse';
            contractor.statusTurns = 3;
          }
        }
        break;

      // 'shop', 'battle', 'item', 'ap_restore', 'bond' are left for the
      // caller to handle since they require game-state or UI beyond our scope.
      default:
        break;
    }
  }
}
