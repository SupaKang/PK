/**
 * battle.js — Turn-based battle engine with FSM
 * Manages battle flow: SELECT_ACTION → EXECUTE → RESULT → END
 */

import { calcDamage, applyStatusDamage, checkStatusAction } from './skill.js';
import { isFainted, attemptCapture, calcExpGain, addExp } from './monster.js';
import { useItem } from './item.js';

// Battle sub-states
export const BATTLE_STATE = {
  INTRO: 'INTRO',
  SELECT_ACTION: 'SELECT',   // Main menu: FIGHT / BAG / SWAP / RUN
  SELECT_SKILL: 'SEL_SKILL', // Pick a skill
  SELECT_ITEM: 'SEL_ITEM',   // Pick an item
  SELECT_SWAP: 'SEL_SWAP',   // Pick party member to swap in
  EXECUTE: 'EXECUTE',
  RESULT: 'RESULT',
  END: 'END',
};

export class BattleEngine {
  /**
   * @param {import('./type.js').TypeChart} typeChart
   */
  constructor(typeChart) {
    this.typeChart = typeChart;
    this.state = BATTLE_STATE.INTRO;
    this.playerMon = null;
    this.enemyMon = null;

    // Party and inventory (set externally)
    this.party = [];      // Array of monster instances
    this.inventory = [];  // Array of {item, count}
    this.monstersData = null; // Set externally for EXP/evolution
    this.skillsData = null;   // Set externally for new skill lookup
    this.expEvents = [];      // Level-up/evolution events from last battle

    // Turn tracking
    this.currentTurn = 0;
    this.turnLog = [];

    // UI state
    this.menuIndex = 0;    // Main menu: 0=FIGHT, 1=BAG, 2=SWAP, 3=RUN
    this.selectedSkill = 0;
    this.selectedItem = 0;
    this.selectedSwap = 0;

    // Floating damage numbers
    this.floatingDamage = []; // [{value, x, y, timer, color}]
    this.messageQueue = [];
    this.currentMessage = '';
    this.messageTimer = 0;
    this.messageDuration = 1.5; // seconds per message

    // Animation state
    this.introTimer = 0;
    this.introDuration = 2.0;
    this.attackAnimTimer = 0;
    this.attackAnimPhase = null; // 'player' or 'enemy'
    this.shakeTimer = 0;

    // Result
    this.battleResult = null; // 'win', 'lose', 'flee'
    this.endTimer = 0;
  }

  /**
   * Start a new battle
   */
  start(playerMonster, enemyMonster) {
    this.playerMon = playerMonster;
    this.enemyMon = enemyMonster;
    this.playerMon.statStages = {};
    this.enemyMon.statStages = {};
    this.state = BATTLE_STATE.INTRO;
    this.introTimer = 0;
    this.currentTurn = 0;
    this.turnLog = [];
    this.menuIndex = 0;
    this.selectedSkill = 0;
    this.selectedItem = 0;
    this.selectedSwap = 0;
    this.messageQueue = [];
    this.currentMessage = `WILD ${enemyMonster.name.toUpperCase()} APPEARED!`;
    this.messageTimer = 0;
    this.battleResult = null;
    this.endTimer = 0;
    this.floatingDamage = [];
  }

  /**
   * Update battle state
   * @param {number} dt
   * @param {Object} keysJustPressed
   * @returns {string|null} 'exit' when battle is completely done
   */
  update(dt, keysJustPressed) {
    switch (this.state) {
      case BATTLE_STATE.INTRO:
        return this._updateIntro(dt);

      case BATTLE_STATE.SELECT_ACTION:
        return this._updateMainMenu(keysJustPressed);

      case BATTLE_STATE.SELECT_SKILL:
        return this._updateSelectSkill(keysJustPressed);

      case BATTLE_STATE.SELECT_ITEM:
        return this._updateSelectItem(keysJustPressed);

      case BATTLE_STATE.SELECT_SWAP:
        return this._updateSelectSwap(keysJustPressed);

      case BATTLE_STATE.EXECUTE:
        return this._updateExecute(dt);

      case BATTLE_STATE.RESULT:
        return this._updateResult(dt);

      case BATTLE_STATE.END:
        return this._updateEnd(dt);
    }
    return null;
  }

  // === INTRO ===
  _updateIntro(dt) {
    this.introTimer += dt;
    this.messageTimer += dt;
    if (this.introTimer >= this.introDuration) {
      this.state = BATTLE_STATE.SELECT_ACTION;
      this.currentMessage = '';
    }
    return null;
  }

  // === MAIN MENU: FIGHT / BAG / SWAP / RUN ===
  _updateMainMenu(keysJustPressed) {
    if (keysJustPressed.ArrowUp || keysJustPressed.KeyW) this.menuIndex = (this.menuIndex + 3) % 4;
    if (keysJustPressed.ArrowDown || keysJustPressed.KeyS) this.menuIndex = (this.menuIndex + 1) % 4;
    if (keysJustPressed.ArrowLeft || keysJustPressed.KeyA) this.menuIndex = (this.menuIndex + 3) % 4;
    if (keysJustPressed.ArrowRight || keysJustPressed.KeyD) this.menuIndex = (this.menuIndex + 1) % 4;

    if (keysJustPressed.Enter || keysJustPressed.Space || keysJustPressed.KeyZ) {
      switch (this.menuIndex) {
        case 0: // FIGHT
          this.state = BATTLE_STATE.SELECT_SKILL;
          this.selectedSkill = 0;
          break;
        case 1: // BAG
          if (this.inventory.length > 0) {
            this.state = BATTLE_STATE.SELECT_ITEM;
            this.selectedItem = 0;
          } else {
            this.currentMessage = 'BAG IS EMPTY!';
            this.messageTimer = 0;
          }
          break;
        case 2: // SWAP
          if (this.party.length > 1) {
            this.state = BATTLE_STATE.SELECT_SWAP;
            this.selectedSwap = 0;
          } else {
            this.currentMessage = 'NO OTHER MONSTERS!';
            this.messageTimer = 0;
          }
          break;
        case 3: // RUN
          this._tryFlee();
          break;
      }
    }
    return null;
  }

  // === SELECT SKILL ===
  _updateSelectSkill(keysJustPressed) {
    const skillCount = this.playerMon.skills.length;
    if (skillCount === 0) {
      this._executeTurn(null);
      return null;
    }

    if (keysJustPressed.ArrowUp || keysJustPressed.KeyW) this.selectedSkill = (this.selectedSkill - 1 + skillCount) % skillCount;
    if (keysJustPressed.ArrowDown || keysJustPressed.KeyS) this.selectedSkill = (this.selectedSkill + 1) % skillCount;
    if (keysJustPressed.ArrowLeft || keysJustPressed.KeyA) this.selectedSkill = Math.max(0, this.selectedSkill - 2);
    if (keysJustPressed.ArrowRight || keysJustPressed.KeyD) this.selectedSkill = Math.min(skillCount - 1, this.selectedSkill + 2);

    if (keysJustPressed.Enter || keysJustPressed.Space || keysJustPressed.KeyZ) {
      const skill = this.playerMon.skills[this.selectedSkill];
      if (skill && skill.ppLeft > 0) {
        this._executeTurn(skill);
      }
    }
    if (keysJustPressed.Escape || keysJustPressed.KeyX) {
      this.state = BATTLE_STATE.SELECT_ACTION;
    }
    return null;
  }

  // === SELECT ITEM ===
  _updateSelectItem(keysJustPressed) {
    const count = this.inventory.length;
    if (count === 0) { this.state = BATTLE_STATE.SELECT_ACTION; return null; }

    if (keysJustPressed.ArrowUp || keysJustPressed.KeyW) this.selectedItem = (this.selectedItem - 1 + count) % count;
    if (keysJustPressed.ArrowDown || keysJustPressed.KeyS) this.selectedItem = (this.selectedItem + 1) % count;

    if (keysJustPressed.Enter || keysJustPressed.Space || keysJustPressed.KeyZ) {
      const slot = this.inventory[this.selectedItem];
      if (slot && slot.count > 0) {
        // Check if it's a capture stone
        if (slot.item.effect && slot.item.effect.type === 'contract') {
          if (!this.enemyMon.isWild) {
            this.currentMessage = 'CANNOT CAPTURE TRAINER MONSTER!';
            this.messageTimer = 0;
            return null;
          }
          slot.count--;
          if (slot.count <= 0) this.inventory.splice(this.selectedItem, 1);
          this.messageQueue = [];
          const captureResult = attemptCapture(this.enemyMon, slot.item);
          for (let i = 0; i < captureResult.shakes; i++) {
            this.messageQueue.push(`... ${i + 1}`);
          }
          if (captureResult.success) {
            this.messageQueue.push(`${this.enemyMon.name} WAS CAPTURED!`);
            if (this.party.length < 6) {
              this.enemyMon.isWild = false;
              this.party.push(this.enemyMon);
              this.messageQueue.push(`${this.enemyMon.name} JOINED YOUR PARTY!`);
            } else {
              this.messageQueue.push('PARTY IS FULL! SENT TO STORAGE.');
            }
            this.battleResult = 'capture';
          } else {
            this.messageQueue.push('IT BROKE FREE!');
            this._enemyAttack();
          }
          this.currentMessage = this.messageQueue.shift() || '';
          this.messageTimer = 0;
          this.state = BATTLE_STATE.EXECUTE;
          return null;
        }

        // Regular item use
        const result = useItem(slot.item, this.playerMon);
        this.messageQueue = [];
        if (result.success) {
          slot.count--;
          if (slot.count <= 0) this.inventory.splice(this.selectedItem, 1);
          this.messageQueue.push(result.message);
          this._enemyAttack();
          if (isFainted(this.playerMon)) {
            this.messageQueue.push(`${this.playerMon.name} FAINTED!`);
            this.battleResult = 'lose';
          }
          this.currentMessage = this.messageQueue.shift() || '';
          this.messageTimer = 0;
          this.state = BATTLE_STATE.EXECUTE;
        } else {
          this.currentMessage = result.message;
          this.messageTimer = 0;
        }
      }
    }
    if (keysJustPressed.Escape || keysJustPressed.KeyX) {
      this.state = BATTLE_STATE.SELECT_ACTION;
    }
    return null;
  }

  // === SELECT SWAP ===
  _updateSelectSwap(keysJustPressed) {
    const available = this.party.filter((m, i) => i > 0 && !isFainted(m));
    if (available.length === 0) { this.state = BATTLE_STATE.SELECT_ACTION; return null; }

    if (keysJustPressed.ArrowUp || keysJustPressed.KeyW) this.selectedSwap = (this.selectedSwap - 1 + this.party.length) % this.party.length;
    if (keysJustPressed.ArrowDown || keysJustPressed.KeyS) this.selectedSwap = (this.selectedSwap + 1) % this.party.length;

    if (keysJustPressed.Enter || keysJustPressed.Space || keysJustPressed.KeyZ) {
      const target = this.party[this.selectedSwap];
      if (target && target !== this.playerMon && !isFainted(target)) {
        this.messageQueue = [];
        this.messageQueue.push(`${this.playerMon.name} COME BACK!`);
        // Swap in party
        const oldIdx = this.party.indexOf(this.playerMon);
        this.party[oldIdx] = target;
        this.party[this.selectedSwap] = this.playerMon;
        this.playerMon = target;
        this.playerMon.statStages = {};
        this.messageQueue.push(`GO ${this.playerMon.name}!`);
        // Enemy gets a free turn
        this._enemyAttack();
        if (isFainted(this.playerMon)) {
          this.messageQueue.push(`${this.playerMon.name} FAINTED!`);
          this.battleResult = 'lose';
        }
        this.currentMessage = this.messageQueue.shift() || '';
        this.messageTimer = 0;
        this.state = BATTLE_STATE.EXECUTE;
      }
    }
    if (keysJustPressed.Escape || keysJustPressed.KeyX) {
      this.state = BATTLE_STATE.SELECT_ACTION;
    }
    return null;
  }

  _tryFlee() {
    if (this.enemyMon.isWild) {
      const fleeChance = (this.playerMon.stats.speed / this.enemyMon.stats.speed) * 0.5 + 0.3;
      if (Math.random() < fleeChance) {
        this.battleResult = 'flee';
        this.currentMessage = 'GOT AWAY SAFELY!';
        this.messageTimer = 0;
        this.state = BATTLE_STATE.END;
        this.endTimer = 0;
      } else {
        this.currentMessage = 'CANNOT ESCAPE!';
        this.messageTimer = 0;
        this.messageQueue = [];
        this._enemyAttack();
        this.currentMessage = this.messageQueue.length > 0 ? this.messageQueue.shift() : 'CANNOT ESCAPE!';
        this.state = BATTLE_STATE.EXECUTE;
      }
    }
  }

  // === EXECUTE TURN ===
  _executeTurn(playerSkill) {
    this.currentTurn++;
    this.messageQueue = [];
    this.state = BATTLE_STATE.EXECUTE;

    // Determine turn order by speed (with stat stages)
    const pSpd = this.playerMon.stats.speed * (this.playerMon.statStages ? (2 + Math.max(0, this.playerMon.statStages.speed || 0)) / 2 : 1);
    const eSpd = this.enemyMon.stats.speed * (this.enemyMon.statStages ? (2 + Math.max(0, this.enemyMon.statStages.speed || 0)) / 2 : 1);
    const playerFirst = pSpd >= eSpd;

    if (playerFirst) {
      this._playerAttack(playerSkill);
      if (!isFainted(this.enemyMon)) {
        this._enemyAttack();
      }
    } else {
      this._enemyAttack();
      if (!isFainted(this.playerMon)) {
        this._playerAttack(playerSkill);
      }
    }

    // End-of-turn status damage
    if (!isFainted(this.playerMon)) {
      const pStatus = applyStatusDamage(this.playerMon);
      if (pStatus) this.messageQueue.push(pStatus.message);
    }
    if (!isFainted(this.enemyMon)) {
      const eStatus = applyStatusDamage(this.enemyMon);
      if (eStatus) this.messageQueue.push(eStatus.message);
    }

    // Check battle end
    if (isFainted(this.enemyMon)) {
      this.messageQueue.push(`${this.enemyMon.name} FAINTED!`);
      this.battleResult = 'win';
    } else if (isFainted(this.playerMon)) {
      this.messageQueue.push(`${this.playerMon.name} FAINTED!`);
      this.battleResult = 'lose';
    }

    // Start showing messages
    this.currentMessage = this.messageQueue.shift() || '';
    this.messageTimer = 0;
    this.attackAnimTimer = 0;
    this.attackAnimPhase = playerFirst ? 'player' : 'enemy';
  }

  _playerAttack(skill) {
    // Status check
    const statusCheck = checkStatusAction(this.playerMon);
    if (statusCheck.message) this.messageQueue.push(statusCheck.message);
    if (!statusCheck.canAct) return;

    if (!skill) {
      skill = { id: 'struggle', name: '발버둥', type: 'normal', category: 'physical', power: 50, accuracy: 100, pp: 999 };
    }
    skill.ppLeft = Math.max(0, (skill.ppLeft || 0) - 1);

    // Burn halves physical attack
    const burnPenalty = (this.playerMon.status === 'burn' && skill.category === 'physical');

    const result = calcDamage(this.playerMon, this.enemyMon, skill, this.typeChart);
    this.messageQueue.push(`${this.playerMon.name} USED ${skill.name}!`);

    if (result.missed) {
      this.messageQueue.push('ATTACK MISSED!');
    } else if (result.damage > 0) {
      let dmg = burnPenalty ? Math.floor(result.damage * 0.5) : result.damage;
      this.enemyMon.hp = Math.max(0, this.enemyMon.hp - dmg);
      // Add floating damage
      this.floatingDamage.push({ value: dmg, x: 360, y: 50, timer: 1.0, color: '#FFFFFF' });

      if (result.critical) this.messageQueue.push('CRITICAL HIT!');
      const label = this.typeChart.getEffectivenessLabel(result.effectiveness);
      if (label) this.messageQueue.push(label + '!');
      if (result.statusApplied && typeof result.statusApplied === 'string' && !result.statusApplied.includes('_')) {
        this.messageQueue.push(`${this.enemyMon.name} IS ${result.statusApplied.toUpperCase()}!`);
      }
    }

    this.turnLog.push({
      turn: this.currentTurn, side: 'player',
      skill: skill.id, damage: result.damage,
      effectiveness: result.effectiveness, critical: result.critical,
    });
  }

  _enemyAttack() {
    // Status check
    const statusCheck = checkStatusAction(this.enemyMon);
    if (statusCheck.message) this.messageQueue.push(statusCheck.message);
    if (!statusCheck.canAct) return;

    const skills = this.enemyMon.skills.filter(s => s.ppLeft > 0 && s.power > 0);
    const skill = skills.length > 0
      ? skills[Math.floor(Math.random() * skills.length)]
      : { id: 'struggle', name: '발버둥', type: 'normal', category: 'physical', power: 50, accuracy: 100, pp: 999 };

    if (skill.ppLeft !== undefined) {
      skill.ppLeft = Math.max(0, skill.ppLeft - 1);
    }

    const burnPenalty = (this.enemyMon.status === 'burn' && skill.category === 'physical');
    const result = calcDamage(this.enemyMon, this.playerMon, skill, this.typeChart);
    this.messageQueue.push(`ENEMY ${this.enemyMon.name} USED ${skill.name}!`);

    if (result.missed) {
      this.messageQueue.push('ATTACK MISSED!');
    } else if (result.damage > 0) {
      let dmg = burnPenalty ? Math.floor(result.damage * 0.5) : result.damage;
      this.playerMon.hp = Math.max(0, this.playerMon.hp - dmg);
      this.floatingDamage.push({ value: dmg, x: 80, y: 120, timer: 1.0, color: '#FF4444' });

      if (result.critical) this.messageQueue.push('CRITICAL HIT!');
      const label = this.typeChart.getEffectivenessLabel(result.effectiveness);
      if (label) this.messageQueue.push(label + '!');
      if (result.statusApplied && typeof result.statusApplied === 'string' && !result.statusApplied.includes('_')) {
        this.messageQueue.push(`${this.playerMon.name} IS ${result.statusApplied.toUpperCase()}!`);
      }
    }

    this.turnLog.push({
      turn: this.currentTurn, side: 'enemy',
      skill: skill.id, damage: result.damage,
      effectiveness: result.effectiveness, critical: result.critical,
    });
  }

  // === EXECUTE ANIMATION ===
  _updateExecute(dt) {
    this.messageTimer += dt;
    this.attackAnimTimer += dt;

    // Update floating damage
    for (let i = this.floatingDamage.length - 1; i >= 0; i--) {
      this.floatingDamage[i].timer -= dt;
      this.floatingDamage[i].y -= dt * 40;
      if (this.floatingDamage[i].timer <= 0) this.floatingDamage.splice(i, 1);
    }

    if (this.messageTimer >= this.messageDuration) {
      if (this.messageQueue.length > 0) {
        this.currentMessage = this.messageQueue.shift();
        this.messageTimer = 0;
      } else {
        if (this.battleResult) {
          this.state = BATTLE_STATE.END;
          this.endTimer = 0;
          this.currentMessage = this.battleResult === 'win' ? 'YOU WIN!' : 'YOU LOST...';
          this.messageTimer = 0;
        } else {
          this.state = BATTLE_STATE.SELECT_ACTION;
          this.menuIndex = 0;
          this.currentMessage = '';
          this.attackAnimPhase = null;
        }
      }
    }
    return null;
  }

  // === RESULT — unused, messages handled in EXECUTE ===
  _updateResult(dt) {
    return null;
  }

  // === END ===
  _updateEnd(dt) {
    this.messageTimer += dt;
    this.endTimer += dt;

    // Show EXP/levelup messages
    if (this.messageQueue.length > 0 && this.messageTimer >= this.messageDuration) {
      this.currentMessage = this.messageQueue.shift();
      this.messageTimer = 0;
      return null;
    }

    if (this.endTimer >= 2.0 && this.messageQueue.length === 0) {
      return 'exit';
    }
    return null;
  }

  /**
   * Called externally after battle result is 'win' to grant EXP
   */
  grantExp() {
    if (this.battleResult !== 'win' || !this.enemyMon) return [];
    const exp = calcExpGain(this.enemyMon);
    this.messageQueue.push(`GAINED ${exp} EXP!`);

    const events = addExp(this.playerMon, exp, this.monstersData, this.skillsData);
    for (const ev of events) {
      if (ev.type === 'levelup') {
        this.messageQueue.push(`${this.playerMon.name} GREW TO Lv.${ev.level}!`);
      } else if (ev.type === 'newskill') {
        this.messageQueue.push(`LEARNED ${ev.skill.name || ev.skill.id}!`);
      } else if (ev.type === 'evolution') {
        this.messageQueue.push(`${ev.fromName} IS EVOLVING...`);
        this.messageQueue.push(`${ev.fromName} EVOLVED INTO ${ev.toName}!`);
      }
    }
    this.expEvents = events;
    return events;
  }
}
