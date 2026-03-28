/**
 * save.js — Save/Load system with localStorage
 * 3 save slots, versioned JSON schema, extensible fields
 */

const SAVE_KEY_PREFIX = 'pk_save_slot_';
const SCHEMA_VERSION = 1;

/**
 * Serialize the current game state into a saveable object
 * @param {Object} game - Game instance
 * @returns {Object} Save data
 */
export function serializeGameState(game) {
  return {
    version: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    playTime: game.playTime || 0,

    playerPosition: {
      mapId: game.mapManager?.currentMap?.id || 'town_01',
      x: game.mapUI?.playerX || 7,
      y: game.mapUI?.playerY || 7,
    },

    playerClass: game.playerClass ? {
      id: game.playerClass.id,
      name: game.playerClass.name,
    } : null,

    party: (game.party || []).map(mon => serializeMonster(mon)),

    inventory: (game.inventory || []).map(slot => ({
      itemId: slot.item.id,
      count: slot.count,
    })),

    gold: game.gold || 0,

    flags: {
      prologueComplete: true,
      classSelected: game.playerClass?.id || null,
    },

    story: game.storyEngine ? game.storyEngine.serialize() : null,

    dex: {
      seen: [...(game.dex?.seen || [])],
      caught: [...(game.dex?.caught || [])],
    },
    achievements: game.achievements ? game.achievements.serialize() : [],
    battleWins: game._battleWins || 0,
    evolveCount: game._evolveCount || 0,
    difficulty: game.difficulty || 'normal',
  };
}

/**
 * Serialize a monster instance
 */
function serializeMonster(mon) {
  return {
    id: mon.id,
    name: mon.name,
    type: mon.type,
    level: mon.level,
    hp: mon.hp,
    maxHp: mon.maxHp,
    exp: mon.exp || 0,
    expToNext: mon.expToNext || 0,
    baseStats: mon.baseStats,
    iv: mon.iv,
    stats: mon.stats,
    skills: (mon.skills || []).map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      category: s.category,
      power: s.power,
      accuracy: s.accuracy,
      pp: s.pp,
      ppLeft: s.ppLeft,
      effect: s.effect || null,
    })),
    status: mon.status,
    isWild: false,
    spriteConfig: mon.spriteConfig || null,
  };
}

/**
 * Deserialize save data into a live game state
 * @param {Object} data - Parsed save JSON
 * @param {Object} game - Game instance to restore into
 * @param {Array} itemsData - Full items.json array
 */
export function deserializeGameState(data, game, itemsData) {
  // Migrate if needed
  const migrated = migrateSchema(data);

  // Restore play time
  game.playTime = migrated.playTime || 0;

  // Restore player class
  if (migrated.playerClass && game.classesData) {
    const classData = game.classesData.find(c => c.id === migrated.playerClass.id);
    if (classData) {
      const { PlayerClass } = game._PlayerClass || {};
      if (PlayerClass) {
        game.playerClass = new PlayerClass(classData);
      }
    }
  }

  // Restore party
  game.party = migrated.party.map(mon => deserializeMonster(mon));
  game.playerMonster = game.party[0] || null;

  // Restore inventory
  game.inventory = migrated.inventory.map(slot => {
    const itemData = (itemsData || []).find(i => i.id === slot.itemId);
    return {
      item: itemData || { id: slot.itemId, name: slot.itemId, effect: null },
      count: slot.count,
    };
  });

  // Restore gold
  game.gold = migrated.gold || 0;

  // Restore story progress
  if (migrated.story && game.storyEngine) {
    game.storyEngine.deserialize(migrated.story);
  }

  // Restore dex
  if (migrated.dex) {
    game.dex = {
      seen: new Set(migrated.dex.seen || []),
      caught: new Set(migrated.dex.caught || []),
    };
  }
  if (migrated.achievements && game.achievements) {
    game.achievements.deserialize(migrated.achievements);
  }
  game._battleWins = migrated.battleWins || 0;
  game._evolveCount = migrated.evolveCount || 0;
  game.difficulty = migrated.difficulty || 'normal';

  // Restore map position
  const pos = migrated.playerPosition;
  if (pos && game.mapManager) {
    game.mapManager.loadMap(pos.mapId);
    if (game.mapUI) {
      game.mapUI.spawn(pos.x, pos.y);
      // Load NPCs for this map
      if (game._getNPCsForMap) {
        game.currentNPCs = game._getNPCsForMap(pos.mapId);
        game.mapUI.npcs = game.currentNPCs;
      }
    }
  }
}

/**
 * Deserialize a monster from save data
 */
function deserializeMonster(data) {
  return {
    id: data.id,
    name: data.name,
    type: data.type || ['normal'],
    level: data.level,
    hp: data.hp,
    maxHp: data.maxHp,
    exp: data.exp || 0,
    expToNext: data.expToNext || 0,
    baseStats: data.baseStats,
    iv: data.iv,
    stats: data.stats,
    skills: data.skills || [],
    status: data.status || null,
    isWild: false,
    spriteConfig: data.spriteConfig || null,
    statStages: {},
  };
}

/**
 * Migrate save data from older schema versions
 */
function migrateSchema(data) {
  let d = { ...data };

  // Version 0 → 1 (or missing version)
  if (!d.version || d.version < 1) {
    d.version = 1;
    if (!d.flags) d.flags = {};
    if (!d.playTime) d.playTime = 0;
  }

  // Future: if (d.version < 2) { ... migrate to v2 ... }

  return d;
}

/**
 * Save game state to a slot (0, 1, or 2)
 * @returns {boolean} Success
 */
export function saveToSlot(slotIndex, game) {
  try {
    const data = serializeGameState(game);
    const key = SAVE_KEY_PREFIX + slotIndex;
    localStorage.setItem(key, JSON.stringify(data));
    console.log(`[PK] Game saved to slot ${slotIndex}`);
    return true;
  } catch (e) {
    console.error('[PK] Save failed:', e);
    return false;
  }
}

/**
 * Load game state from a slot
 * @returns {Object|null} Save data or null
 */
export function loadFromSlot(slotIndex) {
  try {
    const key = SAVE_KEY_PREFIX + slotIndex;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('[PK] Load failed:', e);
    return null;
  }
}

/**
 * Get save slot summaries for UI display
 * @returns {Array} [{slot, exists, summary}]
 */
export function getSaveSlotSummaries() {
  const slots = [];
  for (let i = 0; i < 3; i++) {
    const data = loadFromSlot(i);
    if (data) {
      const leadMon = data.party?.[0];
      slots.push({
        slot: i,
        exists: true,
        playerClass: data.playerClass?.name || '---',
        playTime: formatPlayTime(data.playTime || 0),
        leadMonster: leadMon ? `${leadMon.name} Lv.${leadMon.level}` : '---',
        savedAt: data.savedAt || '',
        partySize: data.party?.length || 0,
      });
    } else {
      slots.push({ slot: i, exists: false });
    }
  }
  return slots;
}

/**
 * Delete a save slot
 */
export function deleteSlot(slotIndex) {
  localStorage.removeItem(SAVE_KEY_PREFIX + slotIndex);
}

/**
 * Format play time (seconds) as HH:MM:SS
 */
export function formatPlayTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
