/**
 * encounter.js — Wild monster encounter system
 * Triggers random encounters based on map data
 */

import { createMonster } from '../core/monster.js';

export class EncounterSystem {
  /**
   * @param {Array} monstersData - Full monsters.json array
   * @param {Array} skillsData - Full skills.json array
   */
  constructor(monstersData, skillsData) {
    this.monstersData = monstersData;
    this.skillsData = skillsData;
    this.stepCounter = 0;
    this.encounterCooldown = 0; // Prevent instant re-encounter after battle
  }

  /**
   * Called when player moves a tile on the map
   * @param {import('../world/map.js').GameMap} map
   * @returns {Object|null} Wild monster instance or null
   */
  checkEncounter(map) {
    if (this.encounterCooldown > 0) {
      this.encounterCooldown--;
      return null;
    }

    // Check map encounter rate
    const rate = map.wildEncounterRate || 0;
    if (rate <= 0 || !map.encounters || map.encounters.length === 0) {
      return null;
    }

    this.stepCounter++;

    // Encounter chance per step
    // rate is 0-1 (e.g., 0.1 = 10% per step)
    const chance = rate > 1 ? rate / 256 : rate;
    if (Math.random() >= chance) {
      return null;
    }

    // Weighted random selection
    const encounter = this._selectEncounter(map.encounters);
    if (!encounter) return null;

    // Find monster base data
    const baseData = this.monstersData.find(m => m.id === encounter.monsterId);
    if (!baseData) return null;

    // Random level within range
    const level = encounter.minLevel +
      Math.floor(Math.random() * (encounter.maxLevel - encounter.minLevel + 1));

    // Create monster instance
    const monster = createMonster(baseData, level, this.skillsData);
    monster.isWild = true;

    // Set cooldown to prevent instant re-encounter
    this.encounterCooldown = 3;

    return monster;
  }

  /**
   * Weighted random selection from encounter table
   */
  _selectEncounter(encounters) {
    const totalWeight = encounters.reduce((sum, e) => sum + (e.weight || 1), 0);
    let roll = Math.random() * totalWeight;

    for (const enc of encounters) {
      roll -= (enc.weight || 1);
      if (roll <= 0) return enc;
    }
    return encounters[0];
  }

  /**
   * Reset cooldown (e.g., after entering a new map)
   */
  resetCooldown() {
    this.encounterCooldown = 5;
  }
}
