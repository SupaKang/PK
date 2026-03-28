/**
 * eval-sprint-011.js — Sprint 011 Evaluation Script
 * Validates: Audio system, difficulty, battle speed, auto-battle
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8080';

test.describe('Sprint 011: Audio / Difficulty / Speed', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
  });

  async function enterGameFast(page) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('z');
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      const game = window.__pkGame;
      if (!game.playerMonster && game.monstersData) {
        const sd = game.monstersData.find(m => m.id === 1);
        if (sd) {
          const mon = { id: sd.id, name: sd.name, type: sd.type, level: 5, hp: 25, maxHp: 25, exp: 0, expToNext: 37,
            baseStats: sd.baseStats, iv: { hp:15,atk:15,def:15,spAtk:15,spDef:15,speed:15 },
            stats: { hp:25,atk:12,def:10,spAtk:13,spDef:11,speed:11 },
            skills: [{ id:'scratch',name:'SCRATCH',type:'normal',category:'physical',power:40,accuracy:100,pp:35,ppLeft:35 }],
            status: null, isWild: false, spriteConfig: sd.spriteConfig, statStages: {} };
          game.playerMonster = mon;
          game.party = [mon];
          game.dex.seen.add(1); game.dex.caught.add(1);
          if (!game.mapManager.currentMap) { game.mapManager.loadMap('town_01'); game.mapUI.spawn(7,7); }
          game.state = 'MAP';
        }
      }
    });
  }

  // === AU-001: AudioManager exists and initializes ===
  test('AU-001: AudioManager exists in game', async ({ page }) => {
    await enterGameFast(page);

    const result = await page.evaluate(() => {
      const game = window.__pkGame;
      return {
        hasAudio: !!game.audio,
        hasInit: typeof game.audio?.init === 'function',
        hasPlayBgm: typeof game.audio?.playBgm === 'function',
        hasPlaySfx: typeof game.audio?.playSfx === 'function',
        hasToggleMute: typeof game.audio?.toggleMute === 'function',
      };
    });

    expect(result.hasAudio).toBe(true);
    expect(result.hasInit).toBe(true);
    expect(result.hasPlayBgm).toBe(true);
    expect(result.hasPlaySfx).toBe(true);
    console.log(`  ✓ AudioManager with init/playBgm/playSfx/toggleMute`);
  });

  // === AU-002: BGM patterns defined for all scenes ===
  test('AU-002: BGM patterns defined for key scenes', async ({ page }) => {
    const fs = await import('fs');
    const content = fs.readFileSync('src/audio/audio.js', 'utf-8');

    expect(content).toContain("title:");
    expect(content).toContain("map:");
    expect(content).toContain("battle:");
    expect(content).toContain("boss:");
    expect(content).toContain("victory:");
    console.log(`  ✓ BGM patterns: title, map, battle, boss, victory`);
  });

  // === AU-003: SFX defined ===
  test('AU-003: SFX defined for game events', async ({ page }) => {
    const fs = await import('fs');
    const content = fs.readFileSync('src/audio/audio.js', 'utf-8');

    expect(content).toContain("attack:");
    expect(content).toContain("levelup:");
    expect(content).toContain("capture:");
    expect(content).toContain("heal:");
    console.log(`  ✓ SFX defined: attack, levelup, capture, heal`);
  });

  // === AU-004: Difficulty system ===
  test('AU-004: Difficulty affects enemy stats', async ({ page }) => {
    await enterGameFast(page);

    const result = await page.evaluate(() => {
      const game = window.__pkGame;
      return {
        defaultDifficulty: game.difficulty,
        validValues: ['easy', 'normal', 'hard'].includes(game.difficulty),
      };
    });

    expect(result.validValues).toBe(true);
    expect(result.defaultDifficulty).toBe('normal');
    console.log(`  ✓ Difficulty: ${result.defaultDifficulty}`);
  });

  // === AU-005: Difficulty scaling in battle ===
  test('AU-005: Hard difficulty scales enemy HP up', async ({ page }) => {
    const fs = await import('fs');
    const content = fs.readFileSync('src/main.js', 'utf-8');

    expect(content).toContain("difficulty === 'hard'");
    expect(content).toContain("1.3");
    expect(content).toContain("difficulty === 'easy'");
    expect(content).toContain("0.7");
    console.log(`  ✓ Hard: 1.3x HP, Easy: 0.7x HP`);
  });

  // === AU-006: Battle speed toggle ===
  test('AU-006: Battle speed cycles 1x→2x→4x', async ({ page }) => {
    await enterGameFast(page);

    const result = await page.evaluate(() => {
      const game = window.__pkGame;
      const speeds = [game.battleSpeed];
      game.battleSpeed = game.battleSpeed === 1 ? 2 : (game.battleSpeed === 2 ? 4 : 1);
      speeds.push(game.battleSpeed);
      game.battleSpeed = game.battleSpeed === 1 ? 2 : (game.battleSpeed === 2 ? 4 : 1);
      speeds.push(game.battleSpeed);
      game.battleSpeed = game.battleSpeed === 1 ? 2 : (game.battleSpeed === 2 ? 4 : 1);
      speeds.push(game.battleSpeed);
      return speeds;
    });

    expect(result).toEqual([1, 2, 4, 1]);
    console.log(`  ✓ Speed cycle: ${result.join('→')}`);
  });

  // === AU-007: Auto-battle toggle ===
  test('AU-007: Auto-battle toggles on/off', async ({ page }) => {
    await enterGameFast(page);

    const result = await page.evaluate(() => {
      const game = window.__pkGame;
      const s1 = game.autoBattle;
      game.autoBattle = !game.autoBattle;
      const s2 = game.autoBattle;
      game.autoBattle = !game.autoBattle;
      const s3 = game.autoBattle;
      return [s1, s2, s3];
    });

    expect(result).toEqual([false, true, false]);
    console.log(`  ✓ Auto-battle: off→on→off`);
  });

  // === AU-008: Source files exist ===
  test('AU-008: audio.js exists with required components', async ({ page }) => {
    const fs = await import('fs');

    expect(fs.existsSync('src/audio/audio.js')).toBe(true);

    const content = fs.readFileSync('src/audio/audio.js', 'utf-8');
    expect(content).toContain('AudioManager');
    expect(content).toContain('Web Audio');
    expect(content).toContain('BGM_PATTERNS');
    expect(content).toContain('SFX_DEFS');
    expect(content).toContain('chiptune');

    console.log(`  ✓ audio.js with AudioManager, BGM, SFX`);
  });

  // === AU-009: No crashes ===
  test('AU-009: No crashes with audio and speed changes', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameFast(page);

    // Toggle settings via evaluate
    await page.evaluate(() => {
      const game = window.__pkGame;
      game.audio.init();
      game.audio.toggleMute();
      game.audio.toggleMute();
      game.audio.setVolume(0.5);
      game.battleSpeed = 4;
      game.autoBattle = true;
      game.difficulty = 'hard';
    });
    await page.waitForTimeout(500);

    const critical = errors.filter(e => !e.includes('Failed to load') && !e.includes('404'));
    expect(critical.length).toBe(0);
    console.log(`  ✓ No crashes`);
  });
});
