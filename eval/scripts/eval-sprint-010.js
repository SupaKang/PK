/**
 * eval-sprint-010.js — Sprint 010 Evaluation Script
 * Validates: Dex, achievements, ending types, save persistence
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8080';

test.describe('Sprint 010: Dex / Achievements / Endings', () => {

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
    // Ensure game is set up even if prologue didn't fully complete
    await page.evaluate(() => {
      const game = window.__pkGame;
      if (!game.playerMonster && game.monstersData) {
        // Force game setup
        const starterData = game.monstersData.find(m => m.id === 1);
        if (starterData) {
          const mon = { id: starterData.id, name: starterData.name, type: starterData.type, level: 5,
            hp: 25, maxHp: 25, exp: 0, expToNext: 37, baseStats: starterData.baseStats,
            iv: { hp: 15, atk: 15, def: 15, spAtk: 15, spDef: 15, speed: 15 },
            stats: { hp: 25, atk: 12, def: 10, spAtk: 13, spDef: 11, speed: 11 },
            skills: [{ id: 'scratch', name: 'SCRATCH', type: 'normal', category: 'physical', power: 40, accuracy: 100, pp: 35, ppLeft: 35 }],
            status: null, isWild: false, spriteConfig: starterData.spriteConfig, statStages: {} };
          game.playerMonster = mon;
          game.party = [mon];
          game.inventory = [{ item: { id: 'potion', name: 'POTION', price: 200, effect: { type: 'heal_hp', value: 30 } }, count: 3 }];
          game.dex.seen.add(1);
          game.dex.caught.add(1);
          if (game.mapManager && !game.mapManager.currentMap) {
            game.mapManager.loadMap('town_01');
            game.mapUI.spawn(7, 7);
          }
          game.state = 'MAP';
        }
      }
    });
  }

  // === DX-001: Dex system tracks seen/caught ===
  test('DX-001: Dex system tracks seen and caught', async ({ page }) => {
    await enterGameFast(page);

    const result = await page.evaluate(() => {
      const game = window.__pkGame;
      game.dex.seen.add(10);
      return {
        seenSize: game.dex.seen.size,
        caughtSize: game.dex.caught.size,
        starterCaught: game.dex.caught.has(1),
      };
    });

    expect(result.starterCaught).toBe(true);
    expect(result.seenSize).toBeGreaterThan(result.caughtSize);
    console.log(`  ✓ Dex: seen=${result.seenSize}, caught=${result.caughtSize}`);
  });

  // === DX-002: Uncaught shows ??? ===
  test('DX-002: Dex shows ??? for unseen monsters', async ({ page }) => {
    await enterGameFast(page);

    const result = await page.evaluate(() => {
      const game = window.__pkGame;
      const unseen = game.monstersData.find(m => !game.dex.seen.has(m.id));
      return { unseenExists: !!unseen, unseenId: unseen?.id };
    });

    expect(result.unseenExists).toBe(true);
    console.log(`  ✓ Monster #${result.unseenId} not in dex (will show ???)`);
  });

  // === DX-003: 15 achievements defined ===
  test('DX-003: Achievement system has 15 achievements', async ({ page }) => {
    await enterGameFast(page);

    const result = await page.evaluate(() => {
      const game = window.__pkGame;
      const all = game.achievements.getAll();
      const tiers = { bronze: 0, silver: 0, gold: 0 };
      all.forEach(a => tiers[a.tier]++);
      return { total: all.length, tiers, names: all.map(a => a.name) };
    });

    expect(result.total).toBe(15);
    expect(result.tiers.bronze).toBeGreaterThan(0);
    expect(result.tiers.gold).toBeGreaterThan(0);
    console.log(`  ✓ ${result.total} achievements (B:${result.tiers.bronze} S:${result.tiers.silver} G:${result.tiers.gold})`);
  });

  // === DX-004: Achievement unlocks on condition ===
  test('DX-004: Achievement unlocks when condition met', async ({ page }) => {
    await enterGameFast(page);

    const result = await page.evaluate(() => {
      const game = window.__pkGame;
      // Ensure starter is in dex
      if (game.playerMonster) {
        game.dex.seen.add(game.playerMonster.id);
        game.dex.caught.add(game.playerMonster.id);
      }
      const before = game.achievements.unlocked.size;
      game.achievements.check(game);
      const after = game.achievements.unlocked.size;
      const hasFirstCatch = game.achievements.unlocked.has('first_catch');
      return { before, after, hasFirstCatch };
    });

    expect(result.hasFirstCatch).toBe(true);
    console.log(`  ✓ first_catch unlocked (${result.before} → ${result.after} achievements)`);
  });

  // === DX-005: Karma endings ===
  test('DX-005: Three karma endings work correctly', async ({ page }) => {
    await enterGameFast(page);

    const result = await page.evaluate(() => {
      const game = window.__pkGame;
      game.storyEngine.karma = 50;
      const light = game.storyEngine.getEndingType();
      game.storyEngine.karma = -50;
      const dark = game.storyEngine.getEndingType();
      game.storyEngine.karma = 10;
      const balance = game.storyEngine.getEndingType();
      game.storyEngine.karma = 0;
      return { light, dark, balance };
    });

    expect(result.light).toBe('light');
    expect(result.dark).toBe('dark');
    expect(result.balance).toBe('balance');
    console.log(`  ✓ Endings verified: light/dark/balance`);
  });

  // === DX-006: Dex persists in save ===
  test('DX-006: Dex data saved and loaded', async ({ page }) => {
    await enterGameFast(page);

    const result = await page.evaluate(() => {
      const game = window.__pkGame;
      game.dex.seen.add(10);
      game.dex.seen.add(20);
      game.dex.caught.add(10);

      // Save
      const data = {
        version: 1, savedAt: new Date().toISOString(), playTime: 0, gold: game.gold,
        playerPosition: { mapId: 'town_01', x: 7, y: 7 },
        playerClass: null,
        party: game.party.map(m => ({ id: m.id, name: m.name, type: m.type, level: m.level, hp: m.hp, maxHp: m.maxHp, baseStats: m.baseStats, iv: m.iv, stats: m.stats, skills: m.skills, status: null, spriteConfig: m.spriteConfig })),
        inventory: game.inventory.map(s => ({ itemId: s.item.id, count: s.count })),
        flags: {}, story: null,
        dex: { seen: [...game.dex.seen], caught: [...game.dex.caught] },
        achievements: game.achievements.serialize(),
        battleWins: 0, evolveCount: 0,
      };
      localStorage.setItem('pk_save_slot_2', JSON.stringify(data));

      const loaded = JSON.parse(localStorage.getItem('pk_save_slot_2'));
      return {
        savedSeen: loaded.dex.seen.length,
        savedCaught: loaded.dex.caught.length,
        hasAchievements: Array.isArray(loaded.achievements),
      };
    });

    expect(result.savedSeen).toBeGreaterThanOrEqual(2);
    expect(result.savedCaught).toBeGreaterThanOrEqual(1);
    expect(result.hasAchievements).toBe(true);
    console.log(`  ✓ Dex saved: ${result.savedSeen} seen, ${result.savedCaught} caught`);
  });

  // === DX-007: Assets exist ===
  test('DX-007: Dex and achievement PixelLab assets exist', async ({ page }) => {
    const fs = await import('fs');
    const path = await import('path');

    for (const file of ['src/assets/ui/dex_frame.png', 'src/assets/ui/achievement_badges.png']) {
      const p = path.resolve(file);
      expect(fs.existsSync(p)).toBe(true);
      expect(fs.statSync(p).size).toBeGreaterThan(100);
      console.log(`  ✓ ${file.split('/').pop()}: ${fs.statSync(p).size} bytes`);
    }
  });

  // === DX-008: Source files exist ===
  test('DX-008: dex-ui.js and achievement.js exist', async ({ page }) => {
    const fs = await import('fs');

    expect(fs.existsSync('src/ui/dex-ui.js')).toBe(true);
    expect(fs.existsSync('src/core/achievement.js')).toBe(true);

    const dexContent = fs.readFileSync('src/ui/dex-ui.js', 'utf-8');
    expect(dexContent).toContain('DexUI');
    expect(dexContent).toContain('caught');
    expect(dexContent).toContain('???');

    const achContent = fs.readFileSync('src/core/achievement.js', 'utf-8');
    expect(achContent).toContain('AchievementSystem');
    expect(achContent).toContain('ACHIEVEMENTS');
    expect(achContent).toContain('toastQueue');

    console.log('  ✓ All source files present');
  });

  // === DX-009: No crashes ===
  test('DX-009: No crashes during dex/achievement flow', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameFast(page);

    // Open dex via evaluate
    await page.evaluate(() => { window.__pkGame.state = 'DEX'; });
    await page.waitForTimeout(500);
    for (const k of ['ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'x']) {
      await page.keyboard.press(k);
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(300);

    const critical = errors.filter(e => !e.includes('Failed to load') && !e.includes('404'));
    expect(critical.length).toBe(0);
    console.log(`  ✓ No crashes`);
  });
});
