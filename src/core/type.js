/**
 * type.js — 18-type matchup system
 * Reads types.json matchups matrix for damage multipliers
 */

export class TypeChart {
  /**
   * @param {Object} typesData - Parsed types.json
   */
  constructor(typesData) {
    this.types = typesData.types || typesData;
    this.matchups = typesData.matchups || {};
    // Build lookup map: id → {name, color}
    this.typeMap = {};
    for (const t of this.types) {
      this.typeMap[t.id] = t;
    }
  }

  /**
   * Get damage multiplier: attackType vs defenderTypes
   * @param {string} atkType - Attacking skill type id
   * @param {string[]} defTypes - Defender's type array
   * @returns {number} Combined multiplier
   */
  getMultiplier(atkType, defTypes) {
    let mult = 1;
    const row = this.matchups[atkType];
    if (!row) return 1;

    for (const defType of defTypes) {
      const val = row[defType];
      if (val !== undefined) {
        mult *= val;
      }
    }
    return mult;
  }

  /**
   * Get type info by id
   */
  getType(typeId) {
    return this.typeMap[typeId] || { id: typeId, name: typeId, color: '#BBBBAA' };
  }

  /**
   * Get type color
   */
  getColor(typeId) {
    return this.getType(typeId).color;
  }

  /**
   * Get effectiveness label
   */
  getEffectivenessLabel(multiplier) {
    if (multiplier === 0) return 'NO EFFECT';
    if (multiplier >= 2) return 'SUPER EFFECTIVE';
    if (multiplier > 1) return 'EFFECTIVE';
    if (multiplier < 1) return 'NOT VERY EFFECTIVE';
    return '';
  }
}
