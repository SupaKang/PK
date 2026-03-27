/**
 * time-encounter.js — Enhanced encounter system with time-of-day mechanics
 *
 * In the demon-ruled world of Pocket Kingdom, magi density (마기 농도)
 * increases at night, making encounters harder but more rewarding.
 * Hidden event tiles glow when the contractor meets level requirements.
 *
 * Self-contained module — zero imports.
 */

// ---------------------------------------------------------------------------
// Night-only monsters — appear when magiDensity > 0.7
// ---------------------------------------------------------------------------

export const NIGHT_MONSTERS = [
  { monsterId: 31, name: '암흑냥이', weight: 3 },   // dark cat
  { monsterId: 64, name: '유령 랜턴', weight: 2 },   // ghost lantern
  { monsterId: 83, name: '달빛 토끼', weight: 2 },   // moon rabbit
  { monsterId: 89, name: '그림자 박쥐', weight: 1 },  // shadow bat
];

// ---------------------------------------------------------------------------
// Hidden event type definitions
// ---------------------------------------------------------------------------

export const HIDDEN_EVENT_TYPES = {
  'fairy_tea_party': {
    reward: 'heal_full',
    description: '요정들이 차를 대접해주었다. 파티가 완전 회복!',
  },
  'wandering_merchant': {
    reward: 'rare_shop',
    description: '떠돌이 상인이 희귀 아이템을 판매한다.',
  },
  'demon_trap': {
    reward: 'battle',
    description: '마족의 함정에 빠졌다!',
    monsterIds: [88, 89],
    levelBonus: 5,
  },
  'ancient_chest': {
    reward: 'item',
    description: '고대의 보물상자를 발견했다!',
    possibleItems: ['ultra_stone', 'full_revive', 'pp_restore_full'],
  },
  'spirit_spring': {
    reward: 'ap_restore',
    description: '영혼의 샘을 발견했다. AP가 회복된다.',
    apAmount: 20,
  },
  'memory_fragment': {
    reward: 'exp',
    description: '할아버지의 기억 조각... 경험치를 얻었다.',
    expAmount: 200,
  },
  'dark_altar': {
    reward: 'stat_boost',
    description: '어둠의 제단. 위험하지만 강해질 수 있다.',
    statBoost: { stat: 'atk', amount: 1 },
  },
};

// ---------------------------------------------------------------------------
// Helpers (internal)
// ---------------------------------------------------------------------------

/**
 * Simple seeded-safe random helpers that rely only on Math.random().
 */
function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function randomFloat() {
  return Math.random();
}

/**
 * Weighted random pick from an array of objects that each have a `weight` key.
 * Returns the chosen object (or null if the array is empty).
 */
function weightedPick(items) {
  if (!items || items.length === 0) return null;

  const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
  let roll = randomFloat() * totalWeight;

  for (const item of items) {
    roll -= (item.weight || 1);
    if (roll <= 0) return item;
  }

  // Fallback (floating-point edge case)
  return items[items.length - 1];
}

/**
 * Determine a terrain multiplier from a tile type string.
 */
function terrainMultiplier(tileType) {
  if (tileType === 'tall_grass') return 1.5;
  if (tileType === 'cave') return 1.3;
  return 1.0;
}

// ---------------------------------------------------------------------------
// TimeEncounterManager
// ---------------------------------------------------------------------------

export class TimeEncounterManager {
  constructor() {
    /** Track which hidden events have already been triggered this session. */
    this._triggeredEvents = new Set();
  }

  // -----------------------------------------------------------------------
  // checkEncounter
  // -----------------------------------------------------------------------

  /**
   * Enhanced encounter check.
   *
   * @param {object}  location     Map / zone descriptor.
   *   Expected shape:
   *     { wildEncounterRate?: number,
   *       tileType?: string,         // 'tall_grass' | 'cave' | ...
   *       encounters?: Array<{monsterId, minLevel, maxLevel, weight?}>,
   *       boss?: object | null,
   *       hiddenEvents?: Array }
   * @param {number}  magiDensity  0 (noon) – 0.9 (midnight). Drives night scaling.
   * @param {number}  stepCount    Steps taken since last encounter.
   *
   * @returns {null | { type: 'wild'|'hidden_event'|'boss', data: object }}
   */
  checkEncounter(location, magiDensity, stepCount) {
    if (!location) return null;

    const baseRate = location.wildEncounterRate ?? 0.15;
    const timeMultiplier = 1 + magiDensity;
    const terrain = terrainMultiplier(location.tileType);
    const finalRate = baseRate * timeMultiplier * terrain;
    const stepThreshold = Math.max(2, Math.floor(10 / finalRate));

    if (stepCount < stepThreshold) return null;

    // --- Night-only special encounter chance ---
    const nightSpecial = this.getNightSpecialEncounter(magiDensity);
    if (nightSpecial) return nightSpecial;

    // --- Boss encounter (if the location defines one) ---
    if (location.boss) {
      return {
        type: 'boss',
        data: { ...location.boss, magiDensity },
      };
    }

    // --- Regular wild encounter ---
    const encounters = location.encounters;
    if (!encounters || encounters.length === 0) return null;

    const picked = weightedPick(encounters);
    if (!picked) return null;

    return {
      type: 'wild',
      data: { ...picked, magiDensity },
    };
  }

  // -----------------------------------------------------------------------
  // generateTimedMonster
  // -----------------------------------------------------------------------

  /**
   * Generate a monster config with level scaled by magi density.
   *
   * @param {object} encounter   Object with at least { monsterId, minLevel, maxLevel }.
   * @param {number} magiDensity 0 – 0.9.
   *
   * @returns {object} Monster config with final computed level.
   */
  generateTimedMonster(encounter, magiDensity) {
    if (!encounter) return null;

    const minLvl = encounter.minLevel ?? 1;
    const maxLvl = encounter.maxLevel ?? minLvl;

    const baseLevel = minLvl + randomInt(0, maxLvl - minLvl);
    const nightBonus = Math.floor(baseLevel * magiDensity * 0.3);
    const finalLevel = baseLevel + nightBonus;

    return {
      monsterId: encounter.monsterId,
      name: encounter.name ?? null,
      level: finalLevel,
      baseLevel,
      nightBonus,
      magiDensity,
      isNightSpawn: magiDensity > 0.7,
    };
  }

  // -----------------------------------------------------------------------
  // checkHiddenEvent
  // -----------------------------------------------------------------------

  /**
   * Check whether the player has triggered a hidden event at a specific tile.
   *
   * @param {number} tileX
   * @param {number} tileY
   * @param {object} mapData           Must contain a `hiddenEvents` array.
   * @param {number} contractorLevel   Current level of the contractor.
   *
   * @returns {null | object} A hidden event object or null.
   */
  checkHiddenEvent(tileX, tileY, mapData, contractorLevel) {
    if (!mapData || !Array.isArray(mapData.hiddenEvents)) return null;

    const event = mapData.hiddenEvents.find(
      (e) => e.x === tileX && e.y === tileY
    );
    if (!event) return null;

    // Build a unique key to avoid re-triggering in the same session.
    const key = `${tileX},${tileY},${event.type}`;
    if (this._triggeredEvents.has(key)) return null;

    const detected = contractorLevel >= (event.requiredLevel ?? 0);

    if (!detected) {
      // 5 % stumble-upon chance per step on the tile.
      if (randomFloat() > 0.05) return null;
    }

    // Trigger the event.
    this._triggeredEvents.add(key);

    const template = HIDDEN_EVENT_TYPES[event.type] || null;

    return {
      x: event.x,
      y: event.y,
      type: event.type,
      detected,
      description: event.description ?? (template ? template.description : ''),
      requiredLevel: event.requiredLevel ?? 0,
      ...(template || {}),
    };
  }

  // -----------------------------------------------------------------------
  // getVisibleHiddenEvents
  // -----------------------------------------------------------------------

  /**
   * Return positions of hidden events the contractor can detect (for UI glow).
   *
   * @param {object} mapData
   * @param {number} contractorLevel
   *
   * @returns {Array<{x: number, y: number, type: string}>}
   */
  getVisibleHiddenEvents(mapData, contractorLevel) {
    if (!mapData || !Array.isArray(mapData.hiddenEvents)) return [];

    return mapData.hiddenEvents
      .filter((e) => {
        const key = `${e.x},${e.y},${e.type}`;
        if (this._triggeredEvents.has(key)) return false;
        return contractorLevel >= (e.requiredLevel ?? 0);
      })
      .map((e) => ({ x: e.x, y: e.y, type: e.type }));
  }

  // -----------------------------------------------------------------------
  // getNightSpecialEncounter
  // -----------------------------------------------------------------------

  /**
   * When magiDensity > 0.7, there is a 20 % chance to replace the normal
   * encounter with a night-special monster.
   *
   * @param {number} magiDensity
   * @returns {null | { type: 'wild', data: object }}
   */
  getNightSpecialEncounter(magiDensity) {
    if (magiDensity <= 0.7) return null;
    if (randomFloat() >= 0.2) return null;

    const picked = weightedPick(NIGHT_MONSTERS);
    if (!picked) return null;

    return {
      type: 'wild',
      data: {
        monsterId: picked.monsterId,
        name: picked.name,
        minLevel: 1,
        maxLevel: 1,
        magiDensity,
        isNightSpecial: true,
      },
    };
  }
}
