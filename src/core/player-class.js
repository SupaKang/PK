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
      speaker: 'PROFESSOR',
      text: 'Welcome, young one. I am the professor of this kingdom.',
    },
    {
      speaker: 'PROFESSOR',
      text: 'In this world, humans form contracts with magical creatures called monsters.',
    },
    {
      speaker: 'PROFESSOR',
      text: 'Those who form these bonds are known as Contractors.',
    },
    {
      speaker: 'PROFESSOR',
      text: 'Before we begin your journey, tell me... what path will you follow?',
      choices: classChoices,
    },
    {
      speaker: 'PROFESSOR',
      text: 'Excellent choice! Now, let me introduce you to your first partner.',
    },
    {
      speaker: 'PROFESSOR',
      text: 'This creature has been waiting for a contractor like you.',
    },
    {
      speaker: 'PROFESSOR',
      text: 'Take good care of each other. Your adventure begins now!',
    },
  ];
}
