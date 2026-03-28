/**
 * game-driver.js — Playwright helper for driving PK game via keyboard input
 *
 * Reads game state through window.__GAME_STATE__() hook exposed in src/main.js.
 * All interactions use keyboard events matching the game's _setupInput() handler.
 *
 * Key mappings (from main.js / battle.js):
 *   Confirm:  Enter | Space | KeyZ
 *   Cancel:   Escape | KeyX
 *   Move:     ArrowUp/Down/Left/Right (grid-based, held)
 *   Menu shortcuts (MAP state): M=party, P=save, D=dex, I=inventory
 *   NPC interact: Enter (facing NPC)
 *   Battle menu: 2×2 grid (FIGHT=0, BAG=1, SWAP=2, RUN=3), arrow keys wrap mod 4
 *   Battle confirm: Enter/Space/Z   Battle cancel: Escape/X
 *
 * FSM states: LOADING, TITLE, MAP, BATTLE, MENU, DIALOG, SHOP, DEX, SAVE_MENU, INVENTORY
 * Battle sub-states: INTRO, SELECT, SEL_SKILL, SEL_ITEM, SEL_SWAP, EXECUTE, RESULT, END
 */
export class GameDriver {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // ─── State queries ───────────────────────────────────────────

  async getState() {
    return this.page.evaluate(() => window.__GAME_STATE__());
  }

  async waitForState(stateName, timeoutMs = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const state = await this.getState();
      if (state.fsm === stateName) return state;
      await this.page.waitForTimeout(200);
    }
    const current = await this.getState();
    throw new Error(
      `Timeout: FSM state '${stateName}' not reached in ${timeoutMs}ms (current: '${current.fsm}')`
    );
  }

  async waitForBattleState(subState, timeoutMs = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const state = await this.getState();
      if (state.fsm !== 'BATTLE') return state; // battle ended
      if (state.battleState === subState) return state;
      await this.page.waitForTimeout(200);
    }
    throw new Error(`Timeout: battle sub-state '${subState}' not reached in ${timeoutMs}ms`);
  }

  async waitForDialogEnd(timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const state = await this.getState();
      if (!state.dialogActive) return;
      await this.page.waitForTimeout(200);
    }
    throw new Error(`Timeout: Dialog did not end in ${timeoutMs}ms`);
  }

  // ─── Input primitives ───────────────────────────────────────

  async pressKey(key, times = 1, delayMs = 100) {
    for (let i = 0; i < times; i++) {
      await this.page.keyboard.press(key);
      await this.page.waitForTimeout(delayMs);
    }
  }

  async confirm() {
    await this.pressKey('Enter');
  }

  async cancel() {
    await this.pressKey('Escape');
  }

  /**
   * Move the player on the grid map.
   * The game processes held keys per frame, so we hold the key for ~250ms per tile.
   */
  async movePlayer(direction, steps = 1) {
    const keyMap = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
    const key = keyMap[direction];
    if (!key) throw new Error(`Invalid direction: ${direction}`);
    for (let i = 0; i < steps; i++) {
      await this.page.keyboard.down(key);
      await this.page.waitForTimeout(250);
      await this.page.keyboard.up(key);
      await this.page.waitForTimeout(100);
    }
  }

  // ─── Menu navigation ───────────────────────────────────────

  /**
   * Navigate a vertical menu (title, save slots, item lists) by pressing ArrowDown
   * `index` times from the top, then confirming.
   */
  async selectMenuItem(index) {
    await this.pressKey('ArrowDown', index, 120);
    await this.confirm();
  }

  /**
   * Navigate battle 2×2 grid menu.
   * Indices: FIGHT=0, BAG=1, SWAP=2, RUN=3
   * ArrowDown/Right increments +1 mod 4.
   * Menu resets to 0 on battle state entry, so we navigate from 0.
   */
  async selectBattleAction(index) {
    if (index > 0) {
      await this.pressKey('ArrowDown', index, 120);
    }
    await this.confirm();
  }

  /**
   * In SEL_SKILL state, pick skill by index then confirm.
   * Skills use ArrowDown (+1) for vertical navigation.
   */
  async selectSkill(index) {
    if (index > 0) {
      await this.pressKey('ArrowDown', index, 120);
    }
    await this.confirm();
  }

  /**
   * In SEL_ITEM state, pick item by index then confirm.
   */
  async selectItem(index) {
    if (index > 0) {
      await this.pressKey('ArrowDown', index, 120);
    }
    await this.confirm();
  }

  // ─── Dialog ─────────────────────────────────────────────────

  /**
   * Rapidly advance through dialog by pressing Enter.
   * Stops when dialog state ends or maxPresses reached.
   */
  async skipDialog(maxPresses = 50) {
    for (let i = 0; i < maxPresses; i++) {
      const state = await this.getState();
      if (!state.dialogActive) return;
      await this.confirm();
      await this.page.waitForTimeout(150);
    }
  }

  /**
   * Skip dialog and select a choice when choices appear.
   * choiceIndex: 0-based, uses ArrowDown to navigate.
   */
  async skipDialogWithChoice(choiceIndex, maxPresses = 50) {
    for (let i = 0; i < maxPresses; i++) {
      const state = await this.getState();
      if (!state.dialogActive) return;
      await this.confirm();
      await this.page.waitForTimeout(150);
    }
    // Dialog with choice: navigate down to choiceIndex and confirm
    if (choiceIndex > 0) {
      await this.pressKey('ArrowDown', choiceIndex, 120);
    }
    await this.confirm();
  }

  // ─── Composite actions ──────────────────────────────────────

  /**
   * Complete the prologue: skip dialog, select class, end up in MAP state.
   * classIndex: 0-based index for class selection dialog choice.
   *
   * The prologue flow:
   *   TITLE → confirm → DIALOG (prologue dialog with class choice at line 3)
   *   → after dialog callback → MAP state with starter monster
   */
  async completePrologue(classIndex = 0) {
    // Skip through prologue dialog lines, selecting class when choices appear
    for (let i = 0; i < 60; i++) {
      const state = await this.getState();
      if (state.fsm === 'MAP') return; // prologue complete
      if (state.fsm === 'DIALOG') {
        // Try selecting class choice by navigating down then confirming
        if (classIndex > 0 && i > 3) {
          // After several presses, we might be at the choice — try arrow down
          await this.pressKey('ArrowDown', classIndex, 80);
        }
        await this.confirm();
        await this.page.waitForTimeout(200);
      } else {
        await this.page.waitForTimeout(200);
      }
    }
    // Final wait for MAP state
    await this.waitForState('MAP', 5000);
  }

  /**
   * Fight one battle turn: select FIGHT → select skill 0 → wait for next SELECT or exit.
   * Returns 'continue' if battle continues, 'ended' if battle ended.
   */
  async fightOneTurn(skillIndex = 0) {
    const state = await this.getState();
    if (state.fsm !== 'BATTLE') return 'ended';

    // Wait for SELECT state
    await this.waitForBattleState('SELECT', 8000);

    // FIGHT (index 0) — no arrow needed, just confirm
    await this.confirm();
    await this.page.waitForTimeout(200);

    // Select skill
    await this.selectSkill(skillIndex);

    // Wait for execution to complete and return to SELECT or end
    for (let i = 0; i < 40; i++) {
      await this.page.waitForTimeout(300);
      const s = await this.getState();
      if (s.fsm !== 'BATTLE') return 'ended';
      if (s.battleState === 'SELECT') return 'continue';
    }
    return 'continue';
  }

  /**
   * Fight the entire battle by repeating fightOneTurn until battle ends.
   * maxTurns prevents infinite loops.
   */
  async fightUntilEnd(maxTurns = 30) {
    for (let t = 0; t < maxTurns; t++) {
      const result = await this.fightOneTurn(0);
      if (result === 'ended') return;
    }
    throw new Error(`Battle did not end after ${maxTurns} turns`);
  }

  /**
   * Walk around on the map until a wild battle triggers.
   * Returns true if battle started, false if maxAttempts exhausted.
   * Note: only works on maps with wildEncounterRate > 0 (routes, not towns).
   */
  async walkUntilBattle(maxAttempts = 150) {
    for (let i = 0; i < maxAttempts; i++) {
      const dir = i % 2 === 0 ? 'right' : 'down';
      await this.movePlayer(dir, 1);
      const state = await this.getState();
      if (state.fsm === 'BATTLE') return true;
    }
    return false;
  }

  /**
   * Force a battle using the debug B key.
   * This is reliable regardless of map encounter rate (works in towns too).
   * The game's _debugForceBattle() ensures the player has a monster and map.
   */
  async forceBattle() {
    await this.pressKey('b');
    await this.page.waitForTimeout(300);
    const state = await this.getState();
    return state.fsm === 'BATTLE';
  }

  /**
   * Save game: from MAP state, press P → select slot → confirm.
   */
  async saveToSlot(slotIndex = 0) {
    await this.pressKey('p'); // KeyP opens save menu
    await this.page.waitForTimeout(400);
    if (slotIndex > 0) {
      await this.pressKey('ArrowDown', slotIndex, 120);
    }
    // Confirm save with Z (or Enter)
    await this.pressKey('z');
    await this.page.waitForTimeout(600); // wait for save message
  }

  /**
   * Load game from title: select LOAD GAME (index 1) → select slot → confirm.
   */
  async loadFromTitle(slotIndex = 0) {
    await this.waitForState('TITLE', 5000);
    // Navigate to LOAD GAME (index 1)
    await this.pressKey('ArrowDown', 1, 120);
    await this.confirm();
    await this.page.waitForTimeout(400);
    // Select slot
    if (slotIndex > 0) {
      await this.pressKey('ArrowDown', slotIndex, 120);
    }
    // Confirm load
    await this.pressKey('z');
    await this.page.waitForTimeout(500);
  }

  // ─── Assertions ─────────────────────────────────────────────

  async assertState(stateName) {
    const state = await this.getState();
    if (state.fsm !== stateName) {
      throw new Error(`Expected FSM state '${stateName}', got '${state.fsm}'`);
    }
  }

  async assertPlayerOnMap(mapId) {
    const state = await this.getState();
    if (state.player.mapId !== mapId) {
      throw new Error(`Expected map '${mapId}', player is on '${state.player.mapId}'`);
    }
  }

  async assertPartySize(expectedSize) {
    const state = await this.getState();
    const actual = state.party?.length || 0;
    if (actual !== expectedSize) {
      throw new Error(`Expected party size ${expectedSize}, got ${actual}`);
    }
  }

  async assertNoConsoleErrors() {
    const errors = await this.page.evaluate(() => window.__CONSOLE_ERRORS__ || []);
    if (errors.length > 0) {
      throw new Error(`Console errors detected:\n${errors.join('\n')}`);
    }
  }

  // ─── Screenshots ────────────────────────────────────────────

  async screenshot(name) {
    const canvas = await this.page.$('canvas');
    if (canvas) {
      await canvas.screenshot({ path: `eval/reports/screenshots/${name}.png` });
    }
  }
}
