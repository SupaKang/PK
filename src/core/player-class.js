/**
 * player-class.js — Player class (contractor) system
 * Manages class selection and stat bonuses
 */

export class PlayerClass {
  /**
   * @param {Object} classData - Entry from classes.json
   */
  constructor(classData) {
    this.id = classData.id;
    this.name = classData.name;
    this.description = classData.description;
    this.type = classData.type || ['normal'];
    this.baseStats = classData.baseStats;
    this.learnset = classData.learnset || [];
  }

  /**
   * Get stat bonus multiplier for a given stat
   * Higher class stat = bonus to party monsters of matching type
   */
  getBonus(stat) {
    const val = this.baseStats[stat] || 50;
    return 1 + (val - 50) / 200; // e.g., 85 atk → 1.175x bonus
  }
}

/**
 * Prologue dialog sequence
 */
export function getPrologueDialogs(classesData) {
  const classChoices = classesData.map(c => `${c.name} - ${c.description.slice(0, 30)}...`);

  return [
    {
      speaker: '',
      text: '......깊은 밤. 따뜻한 방 안에서 화롯불이 타닥거린다.',
    },
    {
      speaker: '할아버지',
      text: '이 혼란한 세상에서, 네가 걸어갈 길을 골라보거라.',
    },
    {
      speaker: '',
      text: '── 어떤 길을 걸을 것인가? ──',
      choices: classChoices,
    },
    {
      speaker: '할아버지',
      text: '...그래, 좋은 선택이다. 앞으로 네 앞길에 축복이 있기를.',
    },
  ];
}
