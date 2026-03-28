/**
 * story.js — Story engine, event triggers, rival/boss battles, karma system
 * Reads story.json chapters and executes scene sequences
 */

import { createMonster } from '../core/monster.js';

/**
 * Story engine — manages chapter progression, event triggers, karma
 */
export class StoryEngine {
  /**
   * @param {Array} chaptersData - story.json chapters array
   * @param {Array} monstersData - monsters.json array
   * @param {Array} skillsData - skills.json array
   */
  constructor(chaptersData, monstersData, skillsData) {
    this.chapters = chaptersData || [];
    this.monstersData = monstersData;
    this.skillsData = skillsData;

    // Progress tracking
    this.currentChapter = 0;
    this.completedEvents = new Set();
    this.karma = 0; // -100 (dark) to +100 (light)

    // Rival tracking
    this.rivalBattleCount = 0;
    this.rivalDefeated = false;

    // Gym/boss tracking
    this.gymsDefeated = [];
    this.shadowBossDefeated = false;
    this.eliteFourDefeated = 0;
    this.championDefeated = false;
  }

  /**
   * Check if an event should trigger
   * @param {string} triggerType - 'arrive', 'defeat_gym', etc.
   * @param {string} location - Current map ID
   * @returns {Object|null} Event to execute, or null
   */
  checkTrigger(triggerType, location) {
    for (const chapter of this.chapters) {
      if (chapter.id > this.currentChapter + 1) break; // Only check current + next chapter

      for (const event of (chapter.events || [])) {
        if (this.completedEvents.has(event.id)) continue;

        // Check trigger match
        if (event.trigger === triggerType && event.location === location) {
          // Check requirements
          if (this._meetsRequirements(event)) {
            return event;
          }
        }
      }
    }
    return null;
  }

  /**
   * Mark an event as completed
   */
  completeEvent(eventId) {
    this.completedEvents.add(eventId);

    // Auto-advance chapter when all events in current chapter are done
    const currentChapterData = this.chapters[this.currentChapter];
    if (currentChapterData) {
      const allDone = currentChapterData.events.every(e => this.completedEvents.has(e.id));
      if (allDone && this.currentChapter < this.chapters.length - 1) {
        this.currentChapter++;
        console.log(`[PK] Story advanced to Chapter ${this.currentChapter}: ${this.chapters[this.currentChapter]?.title}`);
      }
    }
  }

  /**
   * Process scenes from an event into dialog lines + battle triggers
   * @param {Object} event
   * @returns {Array} Processed actions [{type, ...}]
   */
  processEvent(event) {
    const actions = [];

    for (const scene of (event.scenes || [])) {
      switch (scene.type) {
        case 'dialog':
          actions.push({
            type: 'dialog',
            speaker: scene.speaker || '',
            text: scene.text || '',
            choices: scene.choices || null,
          });
          break;

        case 'choice':
          actions.push({
            type: 'dialog',
            speaker: scene.speaker || '',
            text: scene.text || 'CHOOSE:',
            choices: (scene.options || []).map(o => o.text || o),
          });
          break;

        case 'battle':
        case 'rival_battle':
          actions.push({
            type: 'battle',
            trainerName: scene.trainer || scene.speaker || 'TRAINER',
            team: this._buildTeam(scene),
            isRival: scene.type === 'rival_battle',
            isBoss: scene.boss || false,
          });
          break;

        case 'heal':
          actions.push({ type: 'heal' });
          break;

        case 'give_monster':
          actions.push({
            type: 'give_monster',
            monsterId: scene.monsterId,
            level: scene.level || 5,
          });
          break;

        case 'give_item':
          actions.push({
            type: 'give_item',
            itemId: scene.itemId,
            count: scene.count || 1,
          });
          break;

        case 'karma':
          actions.push({
            type: 'karma',
            value: scene.value || 0,
          });
          break;

        default:
          // Treat unknown as dialog
          if (scene.text) {
            actions.push({ type: 'dialog', speaker: scene.speaker || '', text: scene.text });
          }
          break;
      }
    }

    return actions;
  }

  /**
   * Build a trainer team for battle
   */
  _buildTeam(scene) {
    const team = scene.team || scene.monsters || [];
    return team.map(entry => {
      const baseData = this.monstersData.find(m => m.id === entry.monsterId || m.id === entry.id);
      if (!baseData) return null;
      return createMonster(baseData, entry.level || 10, this.skillsData);
    }).filter(Boolean);
  }

  /**
   * Get rival team scaled to player level
   */
  getRivalTeam(playerLevel) {
    this.rivalBattleCount++;
    const level = playerLevel + 2; // Rival is slightly ahead

    // Rival team grows each encounter
    const teamSize = Math.min(this.rivalBattleCount + 1, 4);
    const monsterIds = [4, 10, 7, 2]; // water, electric, grass, fire evos

    return monsterIds.slice(0, teamSize).map(id => {
      const baseData = this.monstersData.find(m => m.id === id);
      if (!baseData) return null;
      const mon = createMonster(baseData, level, this.skillsData);
      mon.isWild = false;
      return mon;
    }).filter(Boolean);
  }

  /**
   * Adjust karma
   */
  adjustKarma(value) {
    this.karma = Math.max(-100, Math.min(100, this.karma + value));
    console.log(`[PK] Karma: ${this.karma}`);
  }

  /**
   * Get ending type based on karma
   * @returns {'light'|'dark'|'balance'}
   */
  getEndingType() {
    if (this.karma >= 30) return 'light';
    if (this.karma <= -30) return 'dark';
    return 'balance';
  }

  /**
   * Check event requirements
   */
  _meetsRequirements(event) {
    if (event.requires) {
      if (event.requires.badges && this.gymsDefeated.length < event.requires.badges) return false;
      if (event.requires.event && !this.completedEvents.has(event.requires.event)) return false;
    }
    return true;
  }

  /**
   * Serialize for save
   */
  serialize() {
    return {
      currentChapter: this.currentChapter,
      completedEvents: [...this.completedEvents],
      karma: this.karma,
      rivalBattleCount: this.rivalBattleCount,
      gymsDefeated: this.gymsDefeated,
      shadowBossDefeated: this.shadowBossDefeated,
      eliteFourDefeated: this.eliteFourDefeated,
      championDefeated: this.championDefeated,
    };
  }

  /**
   * Deserialize from save
   */
  deserialize(data) {
    if (!data) return;
    this.currentChapter = data.currentChapter || 0;
    this.completedEvents = new Set(data.completedEvents || []);
    this.karma = data.karma || 0;
    this.rivalBattleCount = data.rivalBattleCount || 0;
    this.gymsDefeated = data.gymsDefeated || [];
    this.shadowBossDefeated = data.shadowBossDefeated || false;
    this.eliteFourDefeated = data.eliteFourDefeated || 0;
    this.championDefeated = data.championDefeated || false;
  }
}
