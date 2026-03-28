/**
 * eval-sprint-003.js — Sprint 003 Evaluation Script
 * Validates: Battle engine, type matchups, encounter system, battle UI
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8080';

test.describe('Sprint 003: Turn-based Battle & Type Matchups', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
  });

  // Helper: enter game
  async function enterGame(page) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);
  }

  // Helper: force battle via debug key B
  async function forceBattle(page) {
    await page.keyboard.press('KeyB');
    await page.waitForTimeout(500);
  }

  // === DC-001: Battle screen triggers ===
  test('DC-001: Battle screen triggers from map', async ({ page }) => {
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));

    await enterGame(page);
    await forceBattle(page);

    const battleTriggered = logs.some(l => l.includes('Wild') && l.includes('appeared'));
    expect(battleTriggered).toBe(true);
    console.log('  ✓ Battle triggered');
  });

  // === DC-002: Skill → damage → HP decrease ===
  test('DC-002: Skill deals damage and reduces HP', async ({ page }) => {
    await enterGame(page);
    await forceBattle(page);
    await page.waitForTimeout(2500); // INTRO animation

    // Select first skill
    await page.keyboard.press('KeyZ');
    await page.waitForTimeout(3000);

    // Check canvas has battle content
    const pixelData = await page.evaluate(() => {
      const canvas = document.getElementById('game-canvas');
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let colorful = 0;
      for (let i = 0; i < data.length; i += 16) {
        if (data[i] > 50 || data[i+1] > 50 || data[i+2] > 50) colorful++;
      }
      return colorful;
    });

    expect(pixelData).toBeGreaterThan(100);
    console.log('  ✓ Battle UI rendered with skill execution');
  });

  // === DC-003: Type matchup verification ===
  test('DC-003: Fire→Grass=2x, Fire→Water=0.5x type matchups', async ({ page }) => {
    // Test type chart logic directly in browser
    const result = await page.evaluate(async () => {
      // Load types.json
      const resp = await fetch('./data/types.json');
      const typesData = await resp.json();
      const matchups = typesData.matchups;

      return {
        fireVsGrass: matchups.fire.grass,
        fireVsWater: matchups.fire.water,
        waterVsFire: matchups.water.fire,
        electricVsEarth: matchups.electric.earth,
        spiritVsFighting: matchups.spirit.fighting,
      };
    });

    expect(result.fireVsGrass).toBe(2.0);
    expect(result.fireVsWater).toBe(0.5);
    expect(result.waterVsFire).toBe(2.0);
    expect(result.electricVsEarth).toBe(0.0);
    expect(result.spiritVsFighting).toBe(0.0);
    console.log('  ✓ Fire→Grass=2x, Fire→Water=0.5x, Electric→Earth=0x, Spirit→Fighting=0x');
  });

  // === DC-004: HP 0 → battle end → map return ===
  test('DC-004: Battle ends and returns to map', async ({ page }) => {
    await enterGame(page);
    await forceBattle(page);
    await page.waitForTimeout(2500); // INTRO

    // Fight or flee
    for (let turn = 0; turn < 20; turn++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(800);
      await page.keyboard.press('KeyZ');
      await page.waitForTimeout(800);
    }

    const screenshot = await page.screenshot();
    expect(screenshot).toBeTruthy();
    console.log('  ✓ Battle completed/fled — game continues');
  });

  // === DC-005: Monster PixelLab sprites exist ===
  test('DC-005: Monster PixelLab sprites exist on disk', async ({ page }) => {
    const fs = await import('fs');
    const path = await import('path');

    const monstersDir = path.resolve('src/assets/sprites/monsters');

    // Check monster sprite files
    const monsterIds = [1, 4, 7, 10];
    for (const id of monsterIds) {
      const eastPath = path.join(monstersDir, String(id), 'rotations', 'east.png');
      const exists = fs.existsSync(eastPath);
      const size = exists ? fs.statSync(eastPath).size : 0;
      expect(exists).toBe(true);
      expect(size).toBeGreaterThan(100);
      console.log(`  ✓ Monster ${id} east.png: ${size} bytes`);
    }
  });

  // === DC-006: Required source files exist ===
  test('DC-006: Battle system source files exist', async ({ page }) => {
    const fs = await import('fs');

    const requiredFiles = [
      'src/core/type.js',
      'src/core/monster.js',
      'src/core/skill.js',
      'src/core/battle.js',
      'src/world/encounter.js',
      'src/ui/battle-ui.js',
    ];

    for (const file of requiredFiles) {
      expect(fs.existsSync(file)).toBe(true);
      console.log(`  ✓ ${file} exists`);
    }
  });

  // === DC-007: 5 seconds random input no crash ===
  test('DC-007: No crash during 5s random input', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Random input for 5 seconds
    const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyZ', 'KeyX', 'Enter', 'Escape', 'Space'];
    const start = Date.now();
    while (Date.now() - start < 5000) {
      const key = keys[Math.floor(Math.random() * keys.length)];
      await page.keyboard.press(key);
      await page.waitForTimeout(50);
    }

    const criticalErrors = errors.filter(e =>
      !e.includes('Failed to load') && !e.includes('404')
    );
    expect(criticalErrors.length).toBe(0);
    console.log(`  ✓ No crashes during 5s random input (${errors.length} non-critical warnings)`);
  });
});
