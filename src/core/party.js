/**
 * party.js — Party management (max 6 monsters)
 */

import { isFainted } from './monster.js';

export const MAX_PARTY_SIZE = 6;

export class PartyManager {
  /**
   * @param {Array} party - Array of monster instances
   */
  constructor(party) {
    this.party = party;
  }

  /**
   * Add a monster to the party
   * @returns {boolean} true if added, false if full
   */
  add(monster) {
    if (this.party.length >= MAX_PARTY_SIZE) return false;
    monster.isWild = false;
    this.party.push(monster);
    return true;
  }

  /**
   * Swap two party positions
   */
  swap(indexA, indexB) {
    if (indexA < 0 || indexB < 0 || indexA >= this.party.length || indexB >= this.party.length) return;
    const temp = this.party[indexA];
    this.party[indexA] = this.party[indexB];
    this.party[indexB] = temp;
  }

  /**
   * Get the lead (first non-fainted) monster
   */
  getLead() {
    return this.party.find(m => !isFainted(m)) || this.party[0];
  }

  /**
   * Check if all monsters are fainted (blackout)
   */
  isAllFainted() {
    return this.party.every(m => isFainted(m));
  }

  /**
   * Get party size
   */
  get size() {
    return this.party.length;
  }

  /**
   * Is party full?
   */
  get isFull() {
    return this.party.length >= MAX_PARTY_SIZE;
  }
}
